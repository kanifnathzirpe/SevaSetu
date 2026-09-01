"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Droplets, Hospital, MapPin, Phone, Search, Star, Syringe } from "lucide-react";
import * as React from "react";

import { MapView, type MapMarker } from "@/components/map";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { Hospital as HospitalType, Patient } from "@/lib/types";
import { titleCase } from "@/lib/utils";

interface BloodBank {
  id: number;
  name: string;
  locality: string;
  phone: string;
  latitude: number;
  longitude: number;
  units_a_pos: number;
  units_b_pos: number;
  units_o_pos: number;
  units_ab_pos: number;
  units_negative: number;
  total_units: number;
}

const FACILITY_TYPES = [
  "district_hospital",
  "community_health_center",
  "urban_health_center",
  "phc",
  "sub_center",
];

export default function NearbyHospitalsPage() {
  const [search, setSearch] = React.useState("");
  const [facilityType, setFacilityType] = React.useState("");

  const { data: patient } = useQuery({
    queryKey: ["patient", "me"],
    queryFn: () => api.get<Patient>("/api/v1/patient/me"),
  });

  const { data: nearby = [], isLoading } = useQuery({
    queryKey: ["hospitals", "nearby", patient?.latitude, patient?.longitude],
    queryFn: () =>
      api.get<HospitalType[]>(
        `/api/v1/hospitals/nearby?lat=${patient?.latitude ?? 18.5204}&lng=${patient?.longitude ?? 73.8567}&limit=20`
      ),
    enabled: Boolean(patient),
  });

  const { data: bloodBanks = [] } = useQuery({
    queryKey: ["hospitals", "blood-banks"],
    queryFn: () => api.get<BloodBank[]>("/api/v1/hospitals/blood-banks"),
  });

  const { data: vaccinationCenters = [] } = useQuery({
    queryKey: ["hospitals", "vaccination-centers"],
    queryFn: () => api.get<HospitalType[]>("/api/v1/hospitals/vaccination-centers"),
  });

  const filtered = nearby.filter(
    (hospital) =>
      (!facilityType || hospital.facility_type === facilityType) &&
      (!search ||
        hospital.name.toLowerCase().includes(search.toLowerCase()) ||
        hospital.locality.toLowerCase().includes(search.toLowerCase()))
  );

  const markers: MapMarker[] = [
    ...filtered.map((hospital) => ({
      id: `h-${hospital.id}`,
      lat: hospital.latitude,
      lng: hospital.longitude,
      title: hospital.name,
      subtitle: `${titleCase(hospital.facility_type)} · ${hospital.available_beds}/${hospital.total_beds} beds free · ${hospital.distance_km?.toFixed(1)} km`,
      kind: (hospital.facility_type === "phc" || hospital.facility_type === "sub_center" ? "phc" : "hospital") as MapMarker["kind"],
    })),
    ...(patient
      ? [
          {
            id: "me",
            lat: patient.latitude,
            lng: patient.longitude,
            title: "Your location",
            subtitle: `${patient.locality}, Pune`,
            kind: "patient" as const,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Nearby government facilities"
        description="Live bed availability across PHCs, sub-centres, urban health centres and district hospitals"
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <MapView markers={markers} className="h-[380px] w-full" />
        </CardContent>
      </Card>

      <div className="mt-4">
        <Tabs defaultValue="facilities">
          <TabsList>
            <TabsTrigger value="facilities">
              <Hospital className="h-4 w-4" /> Facilities ({filtered.length})
            </TabsTrigger>
            <TabsTrigger value="blood">
              <Droplets className="h-4 w-4" /> Blood banks ({bloodBanks.length})
            </TabsTrigger>
            <TabsTrigger value="vaccination">
              <Syringe className="h-4 w-4" /> Vaccination centres ({vaccinationCenters.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="facilities">
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or locality" className="pl-9" />
              </div>
              <Select value={facilityType} onChange={(event) => setFacilityType(event.target.value)} className="max-w-56">
                <option value="">All facility types</option>
                {FACILITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {titleCase(type)}
                  </option>
                ))}
              </Select>
            </div>

            {isLoading ? (
              <LoadingBlock />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filtered.map((hospital) => (
                  <Card key={hospital.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{hospital.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            <MapPin className="mr-1 inline h-3 w-3" />
                            {hospital.address}
                          </p>
                        </div>
                        <Badge tone="primary">{hospital.distance_km?.toFixed(1)} km</Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <Badge>{titleCase(hospital.facility_type)}</Badge>
                        {hospital.open_24x7 ? <Badge tone="success">24x7</Badge> : null}
                        {hospital.has_emergency ? <Badge tone="danger">Emergency</Badge> : null}
                        {hospital.has_blood_bank ? <Badge tone="info">Blood bank</Badge> : null}
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-lg bg-[var(--muted)] p-2">
                          <p className="font-semibold text-[var(--foreground)]">{hospital.available_beds}</p>
                          <p className="text-[var(--muted-foreground)]">beds free</p>
                        </div>
                        <div className="rounded-lg bg-[var(--muted)] p-2">
                          <p className="font-semibold text-[var(--foreground)]">{hospital.available_icu_beds}</p>
                          <p className="text-[var(--muted-foreground)]">ICU free</p>
                        </div>
                        <div className="rounded-lg bg-[var(--muted)] p-2">
                          <p className="flex items-center justify-center gap-1 font-semibold text-[var(--foreground)]">
                            <Star className="h-3 w-3 fill-[var(--warning)] text-[var(--warning)]" />
                            {hospital.rating}
                          </p>
                          <p className="text-[var(--muted-foreground)]">rating</p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">{hospital.services}</p>

                      <div className="mt-4 flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={`tel:${hospital.phone}`}>
                            <Phone className="h-3.5 w-3.5" /> {hospital.phone}
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="secondary">
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${hospital.latitude}&mlon=${hospital.longitude}#map=16/${hospital.latitude}/${hospital.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Directions
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="blood">
            <div className="grid gap-3 md:grid-cols-2">
              {bloodBanks.map((bank) => (
                <Card key={bank.id}>
                  <CardContent className="p-5">
                    <p className="font-semibold">{bank.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{bank.locality} · {bank.phone}</p>
                    <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
                      {[
                        ["A+", bank.units_a_pos],
                        ["B+", bank.units_b_pos],
                        ["O+", bank.units_o_pos],
                        ["AB+", bank.units_ab_pos],
                        ["Rh−", bank.units_negative],
                      ].map(([label, units]) => (
                        <div key={label as string} className="rounded-lg bg-[var(--muted)] p-2">
                          <p className="font-semibold text-[var(--foreground)]">{units as number}</p>
                          <p className="text-[var(--muted-foreground)]">{label as string}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-[var(--muted-foreground)]">Total {bank.total_units} units available</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vaccination">
            <div className="grid gap-3 md:grid-cols-2">
              {vaccinationCenters.map((center) => (
                <Card key={center.id}>
                  <CardContent className="flex items-start justify-between gap-3 p-5">
                    <div>
                      <p className="font-semibold">{center.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{center.address}</p>
                      <p className="mt-2 text-xs">{center.services}</p>
                    </div>
                    <Building2 className="h-5 w-5 shrink-0 text-[var(--primary)]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
