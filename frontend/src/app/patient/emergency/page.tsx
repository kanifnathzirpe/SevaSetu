"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Ambulance, Hospital, Phone, Siren } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { MapView, type MapMarker } from "@/components/map";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Ambulance as AmbulanceType, Hospital as HospitalType, Patient, Sos } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

const EMERGENCY_TYPES = ["Cardiac", "Accident", "Obstetric", "Respiratory", "Snake bite", "Poisoning", "Medical"];

export default function EmergencyPage() {
  const queryClient = useQueryClient();
  const [type, setType] = React.useState("Medical");
  const [description, setDescription] = React.useState("");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);

  const { data: patient } = useQuery({
    queryKey: ["patient", "me"],
    queryFn: () => api.get<Patient>("/api/v1/patient/me"),
  });

  const lat = coords?.lat ?? patient?.latitude ?? 18.5204;
  const lng = coords?.lng ?? patient?.longitude ?? 73.8567;

  const { data: active } = useQuery({
    queryKey: ["sos", "active"],
    queryFn: () => api.get<Sos | null>("/api/v1/emergency/sos/active"),
    refetchInterval: 15_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["sos", "history"],
    queryFn: () => api.get<Sos[]>("/api/v1/emergency/sos"),
  });

  const { data: ambulances = [] } = useQuery({
    queryKey: ["ambulances", "nearby", lat, lng],
    queryFn: () => api.get<AmbulanceType[]>(`/api/v1/emergency/ambulances/nearby?lat=${lat}&lng=${lng}&limit=6`),
  });

  const { data: phcs = [] } = useQuery({
    queryKey: ["phc", "nearest", lat, lng],
    queryFn: () => api.get<HospitalType[]>(`/api/v1/emergency/phc/nearest?lat=${lat}&lng=${lng}&limit=5`),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["emergency", "contacts"],
    queryFn: () => api.get<{ name: string; number: string; category: string }[]>("/api/v1/emergency/contacts"),
  });

  React.useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => undefined,
      { timeout: 5000 }
    );
  }, []);

  const raise = useMutation({
    mutationFn: () =>
      api.post<Sos>("/api/v1/emergency/sos", {
        emergency_type: type,
        description,
        latitude: lat,
        longitude: lng,
        address: patient?.address ?? "",
      }),
    onSuccess: (data) => {
      toast.success(`Ambulance ${data.ambulance_number} dispatched — ETA ${data.eta_minutes} min`);
      queryClient.invalidateQueries({ queryKey: ["sos"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markers: MapMarker[] = [
    { id: "me", lat, lng, title: "Your location", kind: "patient" },
    ...ambulances.map((ambulance) => ({
      id: `a-${ambulance.id}`,
      lat: ambulance.latitude,
      lng: ambulance.longitude,
      title: ambulance.vehicle_number,
      subtitle: `${ambulance.vehicle_type} · ${ambulance.distance_km?.toFixed(1)} km · ${titleCase(ambulance.status)}`,
      kind: "ambulance" as const,
    })),
    ...phcs.map((hospital) => ({
      id: `p-${hospital.id}`,
      lat: hospital.latitude,
      lng: hospital.longitude,
      title: hospital.name,
      subtitle: `${titleCase(hospital.facility_type)} · ${hospital.distance_km?.toFixed(1)} km`,
      kind: "phc" as const,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Emergency SOS"
        description="One tap dispatches the nearest 108 ambulance and alerts the closest government facility"
      />

      {active ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-4 border-[var(--danger)]">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="flex items-center gap-2 font-semibold text-[var(--danger)]">
                  <Siren className="h-4 w-4 animate-pulse" /> Active emergency · {active.emergency_type}
                </p>
                <p className="mt-1 text-sm">{active.description || "Emergency response in progress"}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">Raised {formatDate(active.created_at, true)}</p>
              </div>
              <div className="grid gap-1 text-sm">
                <p><span className="text-[var(--muted-foreground)]">Ambulance:</span> {active.ambulance_number}</p>
                <p><span className="text-[var(--muted-foreground)]">Driver:</span> {active.ambulance_driver} · {active.ambulance_phone}</p>
                <p><span className="text-[var(--muted-foreground)]">Destination:</span> {active.hospital_name}</p>
                <Badge tone="danger">ETA {active.eta_minutes} minutes · {titleCase(active.status)}</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Raise an SOS</CardTitle>
            <CardDescription>Your live location is shared with the control room</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Emergency type</Label>
              <Select value={type} onChange={(event) => setType(event.target.value)}>
                {EMERGENCY_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>What happened?</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Severe chest pain with sweating" />
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Location: {lat.toFixed(4)}, {lng.toFixed(4)} {coords ? "(live GPS)" : "(from profile)"}
            </p>
            <Button
              variant="danger"
              size="lg"
              className="w-full animate-pulse-ring"
              loading={raise.isPending}
              onClick={() => raise.mutate()}
            >
              <Siren className="h-5 w-5" /> Send emergency SOS
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          <CardContent className="p-0">
            <MapView markers={markers} className="h-[420px] w-full" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ambulance className="h-4 w-4 text-[var(--warning)]" /> Nearest ambulances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ambulances.map((ambulance) => (
              <div key={ambulance.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
                <div>
                  <p className="text-sm font-semibold">{ambulance.vehicle_number}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{ambulance.vehicle_type} · {ambulance.current_location}</p>
                </div>
                <Badge tone={ambulance.status === "available" ? "success" : "warning"}>
                  {ambulance.distance_km?.toFixed(1)} km
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hospital className="h-4 w-4 text-[var(--primary)]" /> Nearest facilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {phcs.map((hospital) => (
              <div key={hospital.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
                <div>
                  <p className="text-sm font-semibold">{hospital.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{titleCase(hospital.facility_type)} · {hospital.locality}</p>
                </div>
                <Badge tone="primary">{hospital.distance_km?.toFixed(1)} km</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[var(--success)]" /> Emergency helplines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.map((contact) => (
              <a
                key={contact.number}
                href={`tel:${contact.number}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3 transition-colors hover:border-[var(--primary)]"
              >
                <div>
                  <p className="text-sm font-semibold">{contact.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{contact.category}</p>
                </div>
                <span className="text-sm font-bold text-[var(--primary)]">{contact.number}</span>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>

      {history.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Past emergencies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
                <div>
                  <p className="text-sm font-semibold">{item.emergency_type}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{item.description}</p>
                </div>
                <div className="text-right text-xs text-[var(--muted-foreground)]">
                  <p>{formatDate(item.created_at, true)}</p>
                  <Badge tone={item.status === "completed" ? "success" : "warning"}>{titleCase(item.status)}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
