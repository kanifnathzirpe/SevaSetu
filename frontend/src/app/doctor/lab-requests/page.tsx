"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Patient, Report } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

const COMMON_TESTS = [
  "Complete Blood Count",
  "Haemoglobin",
  "Blood Sugar (Fasting)",
  "HbA1c",
  "Lipid Profile",
  "Liver Function Test",
  "Kidney Function Test",
  "Thyroid Profile",
  "Urine Routine",
  "Sputum AFB (TB)",
  "Dengue NS1",
  "Chest X-Ray",
];

export default function LabRequestsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ patient_id: 0, title: COMMON_TESTS[0], report_type: "lab", summary: "" });

  const { data: patients = [] } = useQuery({
    queryKey: ["doctor", "patients", ""],
    queryFn: () => api.get<Patient[]>("/api/v1/doctor/patients"),
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["doctor", "lab-requests"],
    queryFn: () => api.get<Report[]>("/api/v1/reports?limit=60"),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<Report>("/api/v1/doctor/lab-requests", {
        patient_id: Number(form.patient_id),
        title: form.title,
        report_type: form.report_type,
        summary: form.summary,
      }),
    onSuccess: () => {
      toast.success("Lab investigation requested");
      queryClient.invalidateQueries({ queryKey: ["doctor", "lab-requests"] });
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        title="Lab requests"
        description="Order investigations and review results from facility laboratories"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request investigation</DialogTitle>
                <DialogDescription>The patient receives a notification with collection instructions.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Patient</Label>
                  <Select value={form.patient_id} onChange={(event) => setForm({ ...form, patient_id: Number(event.target.value) })}>
                    <option value={0}>Select a patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name} — {patient.health_id}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Investigation</Label>
                  <Select value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}>
                    {COMMON_TESTS.map((test) => (
                      <option key={test} value={test}>
                        {test}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Report type</Label>
                  <Select value={form.report_type} onChange={(event) => setForm({ ...form, report_type: event.target.value })}>
                    {["lab", "radiology"].map((type) => (
                      <option key={type} value={type}>
                        {titleCase(type)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Clinical note</Label>
                  <Textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
                </div>
                <Button className="w-full" disabled={!form.patient_id} loading={create.isPending} onClick={() => create.mutate()}>
                  Send request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : reports.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No investigations" description="Requested and completed investigations appear here." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-semibold">{report.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {report.patient_name} · {titleCase(report.report_type)} · {formatDate(report.report_date)}
                  </p>
                  <p className="mt-1 text-sm">{report.summary}</p>
                </div>
                <Badge tone={report.is_abnormal ? "danger" : "success"}>{report.is_abnormal ? "Abnormal" : "Normal"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
