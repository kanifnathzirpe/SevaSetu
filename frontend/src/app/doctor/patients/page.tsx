"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Patient } from "@/lib/types";
import { cn, RISK_STYLES, titleCase } from "@/lib/utils";

export default function DoctorPatientsPage() {
  const [search, setSearch] = React.useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["doctor", "patients", search],
    queryFn: () => api.get<Patient[]>(`/api/v1/doctor/patients${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });

  return (
    <>
      <PageHeader
        title="My patients"
        description="Everyone you have consulted, with quick access to their complete chart"
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients" className="pl-9" />
          </div>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={UserRound} title="No patients found" description="Patients you consult appear here." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((patient) => (
            <Card key={patient.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{patient.full_name}</p>
                    <p className="font-mono text-xs text-[var(--muted-foreground)]">{patient.health_id}</p>
                  </div>
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold capitalize", RISK_STYLES[patient.risk_level])}>
                    {patient.risk_level}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {patient.age} yrs · {titleCase(patient.gender)} · {patient.blood_group} · {patient.locality}
                </p>
                {patient.chronic_conditions ? (
                  <p className="mt-2 text-xs">Conditions: {patient.chronic_conditions}</p>
                ) : null}
                {patient.allergies ? <p className="text-xs text-[var(--danger)]">Allergies: {patient.allergies}</p> : null}
                <div className="mt-3 flex items-center gap-2">
                  {patient.is_pregnant ? <Badge tone="warning">Pregnant</Badge> : null}
                  <Badge tone="info">Health score {patient.health_score}</Badge>
                </div>
                <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                  <Link href={`/doctor/patients/${patient.id}`}>Open chart</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
