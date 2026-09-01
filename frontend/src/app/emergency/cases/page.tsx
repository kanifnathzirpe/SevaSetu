"use client";

import { useQuery } from "@tanstack/react-query";
import { Siren } from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Sos } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

export default function EmergencyCasesPage() {
  const [status, setStatus] = React.useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["emergency", "cases"],
    queryFn: () => api.get<Sos[]>("/api/v1/emergency/sos"),
  });

  const filtered = status ? data.filter((sos) => sos.status === status) : data;

  return (
    <>
      <PageHeader
        title="Case history"
        description="Every emergency response logged by the district control room"
        actions={
          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-48">
            <option value="">All statuses</option>
            {["requested", "dispatched", "en_route", "arrived", "completed", "cancelled"].map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Siren} title="No emergency cases" description="Cases raised through the SOS button appear here." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Case</TH>
                  <TH>Type</TH>
                  <TH>Caller</TH>
                  <TH>Location</TH>
                  <TH>Ambulance</TH>
                  <TH>Receiving facility</TH>
                  <TH>Raised</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((sos) => (
                  <TR key={sos.id}>
                    <TD className="font-medium">#{sos.id}</TD>
                    <TD>{sos.emergency_type}</TD>
                    <TD>{sos.patient_name || "Unregistered"}</TD>
                    <TD className="max-w-[220px] truncate">{sos.address}</TD>
                    <TD>{sos.ambulance_number ?? "—"}</TD>
                    <TD>{sos.hospital_name ?? "—"}</TD>
                    <TD>{formatDate(sos.created_at, true)}</TD>
                    <TD>
                      <Badge
                        tone={
                          sos.status === "completed"
                            ? "success"
                            : sos.status === "cancelled"
                              ? "default"
                              : sos.status === "requested"
                                ? "danger"
                                : "warning"
                        }
                      >
                        {titleCase(sos.status)}
                      </Badge>
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
