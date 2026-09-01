"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Medicine, Patient, Prescription } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface DraftItem {
  medicine_id: number | null;
  medicine_name: string;
  dosage: string;
  duration_days: number;
  instructions: string;
}

export default function DoctorPrescriptionsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [patientId, setPatientId] = React.useState(0);
  const [diagnosis, setDiagnosis] = React.useState("");
  const [advice, setAdvice] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<DraftItem[]>([]);

  const { data: patients = [] } = useQuery({
    queryKey: ["doctor", "patients", ""],
    queryFn: () => api.get<Patient[]>("/api/v1/doctor/patients"),
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["doctor", "prescriptions"],
    queryFn: () => api.get<Prescription[]>("/api/v1/doctor/prescriptions"),
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ["doctor", "medicines", search],
    queryFn: () => api.get<Medicine[]>(`/api/v1/doctor/medicines?limit=16${search ? `&search=${encodeURIComponent(search)}` : ""}`),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<Prescription>("/api/v1/doctor/prescriptions", {
        patient_id: Number(patientId),
        diagnosis,
        advice,
        items,
      }),
    onSuccess: () => {
      toast.success("Prescription issued");
      queryClient.invalidateQueries({ queryKey: ["doctor", "prescriptions"] });
      setOpen(false);
      setItems([]);
      setDiagnosis("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        title="Prescriptions"
        description="Digitally signed prescriptions delivered instantly to the patient's health record"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Write prescription</DialogTitle>
                <DialogDescription>Select a patient and add medicines from the district formulary.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Patient</Label>
                  <Select value={patientId} onChange={(event) => setPatientId(Number(event.target.value))}>
                    <option value={0}>Select a patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name} — {patient.health_id}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Diagnosis</Label>
                  <Input value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Search formulary</Label>
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Paracetamol…" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {medicines.map((medicine) => (
                      <button
                        key={medicine.id}
                        type="button"
                        onClick={() =>
                          setItems((previous) => [
                            ...previous,
                            { medicine_id: medicine.id, medicine_name: medicine.name, dosage: "1-0-1", duration_days: 5, instructions: "After food" },
                          ])
                        }
                        className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                      >
                        <Plus className="mr-1 inline h-3 w-3" />
                        {medicine.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {items.map((item, index) => (
                  <div key={`${item.medicine_name}-${index}`} className="grid gap-2 sm:grid-cols-[1.4fr_0.8fr_0.7fr_1.2fr_auto]">
                    <Input
                      value={item.medicine_name}
                      onChange={(event) => setItems((prev) => prev.map((row, i) => (i === index ? { ...row, medicine_name: event.target.value } : row)))}
                    />
                    <Input
                      value={item.dosage}
                      onChange={(event) => setItems((prev) => prev.map((row, i) => (i === index ? { ...row, dosage: event.target.value } : row)))}
                    />
                    <Input
                      type="number"
                      value={item.duration_days}
                      onChange={(event) => setItems((prev) => prev.map((row, i) => (i === index ? { ...row, duration_days: Number(event.target.value) } : row)))}
                    />
                    <Input
                      value={item.instructions}
                      onChange={(event) => setItems((prev) => prev.map((row, i) => (i === index ? { ...row, instructions: event.target.value } : row)))}
                    />
                    <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1.5">
                <Label>Advice</Label>
                <Textarea value={advice} onChange={(event) => setAdvice(event.target.value)} />
              </div>

              <Button className="mt-6 w-full" disabled={!patientId || items.length === 0} loading={create.isPending} onClick={() => create.mutate()}>
                Issue prescription
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : history.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No prescriptions issued" description="Prescriptions you write appear here." />
      ) : (
        <div className="space-y-3">
          {history.map((prescription) => (
            <Card key={prescription.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {prescription.patient_name} · {prescription.diagnosis || "Consultation"}
                </CardTitle>
                <CardDescription>
                  Issued {formatDate(prescription.issued_on)}
                  {prescription.follow_up_date ? ` · follow-up ${formatDate(prescription.follow_up_date)}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
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
                        <TD>{item.instructions}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                {prescription.advice ? <p className="mt-3 text-sm">Advice: {prescription.advice}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
