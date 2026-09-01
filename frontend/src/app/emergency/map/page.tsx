"use client";

import { useQuery } from "@tanstack/react-query";
import { Ambulance as AmbulanceIcon, Hospital as HospitalIcon, Siren } from "lucide-react";
import * as React from "react";

import { MapView, type MapMarker } from "@/components/map";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import type { Ambulance, Hospital, Sos } from "@/lib/types";
import { titleCase } from "@/lib/utils";

interface ConsolePayload {
  active_sos: Sos[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
}

export default function EmergencyMapPage() {
  const [showAmbulances, setShowAmbulances] = React.useState(true);
  const [showHospitals, setShowHospitals] = React.useState(true);
  const [showSos, setShowSos] = React.useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["emergency", "console"],
    queryFn: () => api.get<ConsolePayload>("/api/v1/emergency/console"),
    refetchInterval: 20_000,
  });

  if (isLoading || !data) return <LoadingBlock rows={5} />;

  const markers: MapMarker[] = [
    ...(showSos
      ? data.active_sos.map((sos) => ({
          id: `sos-${sos.id}`,
          lat: sos.latitude,
          lng: sos.longitude,
          title: `SOS #${sos.id} · ${sos.emergency_type}`,
          subtitle: `${sos.address} · ${titleCase(sos.status)}`,
          kind: "sos" as const,
        }))
      : []),
    ...(showAmbulances
      ? data.ambulances.map((ambulance) => ({
          id: `amb-${ambulance.id}`,
          lat: ambulance.latitude,
          lng: ambulance.longitude,
          title: ambulance.vehicle_number,
          subtitle: `${titleCase(ambulance.status)} · ${ambulance.current_location}`,
          kind: "ambulance" as const,
        }))
      : []),
    ...(showHospitals
      ? data.hospitals.map((hospital) => ({
          id: `hosp-${hospital.id}`,
          lat: hospital.latitude,
          lng: hospital.longitude,
          title: hospital.name,
          subtitle: `${hospital.available_beds}/${hospital.total_beds} beds · ${hospital.available_icu_beds} ICU free`,
          kind: "hospital" as const,
        }))
      : []),
  ];

  return (
    <>
      <PageHeader title="Live response map" description="Real-time positions of 108 ambulances, active SOS calls and receiving hospitals" />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-6 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Switch checked={showSos} onCheckedChange={setShowSos} />
            <Siren className="h-4 w-4 text-[var(--danger)]" /> SOS ({data.active_sos.length})
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showAmbulances} onCheckedChange={setShowAmbulances} />
            <AmbulanceIcon className="h-4 w-4 text-[var(--warning)]" /> Ambulances ({data.ambulances.length})
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showHospitals} onCheckedChange={setShowHospitals} />
            <HospitalIcon className="h-4 w-4 text-[var(--primary)]" /> Hospitals ({data.hospitals.length})
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <MapView markers={markers} className="h-[520px] w-full" />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Fleet readiness</CardTitle>
          <CardDescription>Vehicle status snapshot</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.ambulances.map((ambulance) => (
            <div key={ambulance.id} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{ambulance.vehicle_number}</p>
                <Badge tone={ambulance.status === "available" ? "success" : ambulance.status === "on_duty" ? "warning" : "default"}>
                  {titleCase(ambulance.status)}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {ambulance.driver_name} · {ambulance.current_location}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {titleCase(ambulance.vehicle_type)}
                {ambulance.has_oxygen ? " · Oxygen" : ""}
                {ambulance.has_ventilator ? " · Ventilator" : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
