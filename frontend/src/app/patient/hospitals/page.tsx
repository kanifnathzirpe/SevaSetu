"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Droplets, Hospital, MapPin, Phone, Pill, Search, Star, Syringe, TestTube } from "lucide-react";
import * as React from "react";

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

interface Pharmacy {
  id: number;
  name: string;
  locality: string;
  address: string;
  phone: string;
  distance_km: number;
  is_demo: boolean;
}

interface DiagnosticLab {
  id: number;
  name: string;
  locality: string;
  address: string;
  phone: string;
  distance_km: number;
  is_demo: boolean;
}

const FACILITY_TYPES = [
  "district_hospital",
  "community_health_center",
  "urban_health_center",
  "phc",
  "sub_center",
];

const DEMO_PHARMACIES: Pharmacy[] = [
  { id: 1001, name: "Apollo Pharmacy", locality: "Hadapsar", address: "Gadital Road, Hadapsar", phone: "020-26991234", distance_km: 0.8, is_demo: true },
  { id: 1002, name: "MedPlus", locality: "Kharadi", address: "EON IT Park Road, Kharadi", phone: "020-27004567", distance_km: 2.1, is_demo: true },
  { id: 1003, name: "Jan Aushadhi Kendra", locality: "Viman Nagar", address: "Near Airport Road, Viman Nagar", phone: "020-26678901", distance_km: 3.5, is_demo: true },
  { id: 1004, name: "Wellness Forever", locality: "Kothrud", address: "Karve Road, Kothrud", phone: "020-25432109", distance_km: 4.2, is_demo: true },
  { id: 1005, name: "PharmEasy", locality: "Baner", address: "Baner-Pashan Road, Baner", phone: "020-23456789", distance_km: 5.8, is_demo: true },
  { id: 1006, name: "Netmeds", locality: "Aundh", address: "Aundh Road, Aundh", phone: "020-25678901", distance_km: 3.2, is_demo: true },
  { id: 1007, name: "1mg", locality: "Shivajinagar", address: "Shivaji Road, Shivajinagar", phone: "020-26012345", distance_km: 1.5, is_demo: true },
  { id: 1008, name: "Subsequent Pharma", locality: "Wagholi", address: "Nagar Road, Wagholi", phone: "020-26543210", distance_km: 6.4, is_demo: true },
  { id: 1009, name: "Fortis Pharmacy", locality: "Pimpri", address: "Near YCM Hospital, Pimpri", phone: "020-27456789", distance_km: 7.1, is_demo: true },
  { id: 1010, name: "Lily Pharmacy", locality: "Hinjawadi", address: "Phase 1, Hinjawadi", phone: "020-22987654", distance_km: 8.3, is_demo: true },
];

const DEMO_DIAGNOSTIC_LABS: DiagnosticLab[] = [
  { id: 2001, name: "Metropolis Healthcare", locality: "Hadapsar", address: "Gadital Road, Hadapsar", phone: "020-26992345", distance_km: 1.2, is_demo: true },
  { id: 2002, name: "Dr. Lal PathLabs", locality: "Kharadi", address: "EON IT Park Road, Kharadi", phone: "020-27005678", distance_km: 2.4, is_demo: true },
  { id: 2003, name: "Suburban Diagnostics", locality: "Shivajinagar", address: "Shivaji Road, Shivajinagar", phone: "020-26023456", distance_km: 1.8, is_demo: true },
  { id: 2004, name: "SRL Diagnostics", locality: "Kothrud", address: "Karve Road, Kothrud", phone: "020-25433210", distance_km: 4.5, is_demo: true },
  { id: 2005, name: "Thyrocare", locality: "Baner", address: "Baner-Pashan Road, Baner", phone: "020-23457890", distance_km: 6.1, is_demo: true },
  { id: 2006, name: "PathKind Labs", locality: "Aundh", address: "Aundh Road, Aundh", phone: "020-25689012", distance_km: 3.5, is_demo: true },
  { id: 2007, name: "Vijaya Diagnostic Centre", locality: "Viman Nagar", address: "Near Airport Road, Viman Nagar", phone: "020-26689012", distance_km: 3.8, is_demo: true },
  { id: 2008, name: "Anand Laboratory", locality: "Wagholi", address: "Nagar Road, Wagholi", phone: "020-26554321", distance_km: 6.8, is_demo: true },
  { id: 2009, name: "Ruby Hall Clinic Lab", locality: "Pimpri", address: "Near YCM Hospital, Pimpri", phone: "020-27467890", distance_km: 7.4, is_demo: true },
  { id: 2010, name: "Noble Diagnostic Centre", locality: "Hinjawadi", address: "Phase 1, Hinjawadi", phone: "020-22998765", distance_km: 8.6, is_demo: true },
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

  const filteredPharmacies = DEMO_PHARMACIES.filter(
    (pharmacy) =>
      !search ||
      pharmacy.name.toLowerCase().includes(search.toLowerCase()) ||
      pharmacy.locality.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLabs = DEMO_DIAGNOSTIC_LABS.filter(
    (lab) =>
      !search ||
      lab.name.toLowerCase().includes(search.toLowerCase()) ||
      lab.locality.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Nearby Services"
        description="Live bed availability at nearby public healthcare facilities"
      />

      <div className="mt-4">
        <Tabs defaultValue="pharmacies">
          <TabsList className="flex-wrap">
            <TabsTrigger value="pharmacies">
              <Pill className="h-4 w-4" /> Pharmacies ({filteredPharmacies.length})
            </TabsTrigger>
            <TabsTrigger value="labs">
              <TestTube className="h-4 w-4" /> Diagnostic Labs ({filteredLabs.length})
            </TabsTrigger>
            <TabsTrigger value="blood">
              <Droplets className="h-4 w-4" /> Blood Banks ({bloodBanks.length})
            </TabsTrigger>
            <TabsTrigger value="vaccination">
              <Syringe className="h-4 w-4" /> Vaccination Centres ({vaccinationCenters.length})
            </TabsTrigger>
            <TabsTrigger value="facilities">
              <Hospital className="h-4 w-4" /> Facilities ({filtered.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pharmacies">
            <div className="mb-4">
              <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or locality" className="pl-9" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {filteredPharmacies.map((pharmacy) => (
                <Card key={pharmacy.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{pharmacy.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          <MapPin className="mr-1 inline h-3 w-3" />
                          {pharmacy.address}
                        </p>
                      </div>
                      <Badge tone="primary">{pharmacy.distance_km.toFixed(1)} km</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge>Pharmacy</Badge>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={`tel:${pharmacy.phone}`}>
                          <Phone className="h-3.5 w-3.5" /> {pharmacy.phone}
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="secondary">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${18.5204}&mlon=${73.8567}#map=16/18.5204/73.8567`}
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
          </TabsContent>

          <TabsContent value="labs">
            <div className="mb-4">
              <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or locality" className="pl-9" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {filteredLabs.map((lab) => (
                <Card key={lab.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{lab.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          <MapPin className="mr-1 inline h-3 w-3" />
                          {lab.address}
                        </p>
                      </div>
                      <Badge tone="primary">{lab.distance_km.toFixed(1)} km</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge>Diagnostic Lab</Badge>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={`tel:${lab.phone}`}>
                          <Phone className="h-3.5 w-3.5" /> {lab.phone}
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="secondary">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${18.5204}&mlon=${73.8567}#map=16/18.5204/73.8567`}
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
          </TabsContent>

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
            <div className="mb-4">
              <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or locality" className="pl-9" />
              </div>
            </div>

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
            <div className="mb-4">
              <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or locality" className="pl-9" />
              </div>
            </div>

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
