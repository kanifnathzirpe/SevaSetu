"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";

interface AshaRow {
  id: number;
  name: string;
  asha_code: string;
  phone: string;
  assigned_area: string;
  households: number;
  experience_years: number;
  visits_this_month: number;
}

export default function AdminAshaWorkersPage() {
  const [search, setSearch] = React.useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "asha-workers"],
    queryFn: () => api.get<AshaRow[]>("/api/v1/admin/asha-workers"),
  });

  const filtered = data.filter(
    (row) =>
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.assigned_area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="ASHA workforce"
        description="Accredited Social Health Activists and their field coverage this month"
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or area" className="pl-9" />
          </div>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No ASHA workers found" description="Try a different search term." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>ASHA code</TH>
                  <TH>Assigned area</TH>
                  <TH>Households</TH>
                  <TH>Experience</TH>
                  <TH>Visits this month</TH>
                  <TH>Phone</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((row) => (
                  <TR key={row.id}>
                    <TD className="font-medium">{row.name}</TD>
                    <TD className="font-mono text-xs">{row.asha_code}</TD>
                    <TD>{row.assigned_area}</TD>
                    <TD>{row.households}</TD>
                    <TD>{row.experience_years} yrs</TD>
                    <TD className="font-semibold">{row.visits_this_month}</TD>
                    <TD>
                      <a className="text-[var(--primary)]" href={`tel:${row.phone}`}>
                        {row.phone}
                      </a>
                    </TD>
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
