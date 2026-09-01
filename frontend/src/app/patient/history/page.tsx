"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, Pill, Stethoscope } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Appointment, Patient, Prescription } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

interface HistoryPayload {
  patient: Patient;
  timeline: { type: string; date: string; title: string; detail: string; status: string }[];
  appointments: Appointment[];
  prescriptions: Prescription[];
}

export default function MedicalHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["patient", "medical-history"],
    queryFn: () => api.get<HistoryPayload>("/api/v1/patient/medical-history"),
  });

  if (isLoading || !data) return <LoadingBlock rows={6} />;

  return (
    <>
      <PageHeader
        title="Medical history"
        description={`Complete longitudinal record for ${data.patient.full_name} · Health ID ${data.patient.health_id}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Care timeline</CardTitle>
            <CardDescription>Every consultation and prescription in chronological order</CardDescription>
          </CardHeader>
          <CardContent>
            {data.timeline.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No history yet" description="Your visits will be recorded here." />
            ) : (
              <ol className="relative space-y-5 border-l border-[var(--border)] pl-6">
                {data.timeline.map((entry, index) => (
                  <li key={`${entry.date}-${index}`} className="relative">
                    <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--primary)]">
                      {entry.type === "prescription" ? <Pill className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{entry.title}</p>
                      <Badge tone={entry.status === "completed" ? "success" : entry.status === "cancelled" ? "danger" : "primary"}>
                        {titleCase(entry.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDate(entry.date)}</p>
                    {entry.detail ? <p className="mt-1 text-sm">{entry.detail}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clinical profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Blood group", data.patient.blood_group],
                ["Age", `${data.patient.age} years`],
                ["Gender", titleCase(data.patient.gender)],
                ["Height", `${data.patient.height_cm} cm`],
                ["Weight", `${data.patient.weight_kg} kg`],
                ["Risk level", titleCase(data.patient.risk_level)],
                ["Allergies", data.patient.allergies || "None recorded"],
                ["Chronic conditions", data.patient.chronic_conditions || "None recorded"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-0">
                  <span className="text-[var(--muted-foreground)]">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--primary)]" /> Consultation summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-[var(--muted)] p-3">
                <p className="text-2xl font-bold">{data.appointments.length}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Consultations</p>
              </div>
              <div className="rounded-xl bg-[var(--muted)] p-3">
                <p className="text-2xl font-bold">{data.prescriptions.length}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Prescriptions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
