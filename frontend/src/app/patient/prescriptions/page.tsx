"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Pill } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { API_BASE_URL, api, tokenStore } from "@/lib/api";
import type { Prescription } from "@/lib/types";
import { downloadTextFile, formatDate } from "@/lib/utils";

async function downloadPrescription(prescription: Prescription) {
  const response = await fetch(`${API_BASE_URL}/api/v1/reports/prescriptions/${prescription.id}/download`, {
    headers: { Authorization: `Bearer ${tokenStore.access ?? ""}` },
  });
  if (!response.ok) {
    toast.error("Unable to download prescription");
    return;
  }
  downloadTextFile(`prescription-${prescription.id}.txt`, await response.text());
  toast.success("Prescription downloaded");
}

export default function PrescriptionsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["patient", "prescriptions"],
    queryFn: () => api.get<Prescription[]>("/api/v1/patient/prescriptions"),
  });

  return (
    <>
      <PageHeader title="Prescriptions" description="Digitally signed prescriptions issued by medical officers" />

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={Pill} title="No prescriptions yet" description="Prescriptions from your consultations appear here." />
      ) : (
        <div className="space-y-4">
          {data.map((prescription) => (
            <Card key={prescription.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{prescription.diagnosis || "General consultation"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {prescription.doctor_name} · issued {formatDate(prescription.issued_on)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {prescription.follow_up_date ? (
                      <Badge tone="warning">Follow-up {formatDate(prescription.follow_up_date)}</Badge>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => downloadPrescription(prescription)}>
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <THead>
                      <TR>
                        <TH>Medicine</TH>
                        <TH>Dosage</TH>
                        <TH>Duration</TH>
                        <TH>Instructions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {prescription.items.map((item) => (
                        <TR key={item.id}>
                          <TD className="font-medium">{item.medicine_name}</TD>
                          <TD>{item.dosage}</TD>
                          <TD>{item.duration_days} days</TD>
                          <TD className="text-[var(--muted-foreground)]">{item.instructions}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>

                {prescription.advice ? (
                  <p className="mt-3 rounded-xl bg-[var(--muted)] p-3 text-sm">
                    <span className="font-semibold">Advice: </span>
                    {prescription.advice}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
