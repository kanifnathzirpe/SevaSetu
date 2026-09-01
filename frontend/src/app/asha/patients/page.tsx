"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Patient } from "@/lib/types";
import { cn, RISK_STYLES, titleCase } from "@/lib/utils";

export default function AshaPatientsPage() {
  const [search, setSearch] = React.useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["asha", "patients"],
    queryFn: () => api.get<Patient[]>("/api/v1/asha/patients"),
  });

  const filtered = data.filter(
    (patient) =>
      patient.full_name.toLowerCase().includes(search.toLowerCase()) ||
      patient.health_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="My patients"
        description="Every person registered under your sub-centre with their current risk band"
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients" className="pl-9" />
          </div>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserRound} title="No patients found" description="Patients registered in your ward appear here." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Health ID</TH>
                  <TH>Age / Gender</TH>
                  <TH>Blood group</TH>
                  <TH>Locality</TH>
                  <TH>Conditions</TH>
                  <TH>Risk</TH>
                  <TH>Score</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((patient) => (
                  <TR key={patient.id}>
                    <TD className="font-medium">
                      {patient.full_name}
                      {patient.is_pregnant ? <Badge tone="warning" className="ml-2">Pregnant</Badge> : null}
                    </TD>
                    <TD className="font-mono text-xs">{patient.health_id}</TD>
                    <TD>
                      {patient.age} · {titleCase(patient.gender)}
                    </TD>
                    <TD>{patient.blood_group}</TD>
                    <TD>{patient.locality}</TD>
                    <TD className="max-w-56 truncate text-[var(--muted-foreground)]">
                      {patient.chronic_conditions || "None"}
                    </TD>
                    <TD>
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold capitalize", RISK_STYLES[patient.risk_level])}>
                        {patient.risk_level}
                      </span>
                    </TD>
                    <TD className="font-semibold">{patient.health_score}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
