"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRightLeft, ClipboardList, FlaskConical, MessageSquare, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { NewReferralModal } from "@/components/new-referral-modal";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { Appointment, Medicine, Patient, Prescription, Report } from "@/lib/types";
import { cn, formatDate, titleCase } from "@/lib/utils";

interface HistoryPayload {
  patient: Patient;
  appointments: Appointment[];
  prescriptions: Prescription[];
  reports: Report[];
}

interface DraftItem {
  medicine_id: number | null;
  medicine_name: string;
  dosage: string;
  duration_days: number;
  instructions: string;
}

const REPORT_TYPES = ["lab", "radiology", "discharge", "prescription", "vaccination"];

function PrescriptionDialog({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [diagnosis, setDiagnosis] = React.useState("");
  const [advice, setAdvice] = React.useState("Rest, hydration and follow the dosage schedule strictly.");
  const [followUp, setFollowUp] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<DraftItem[]>([]);

  const { data: medicines = [] } = useQuery({
    queryKey: ["doctor", "medicines", search],
    queryFn: () => api.get<Medicine[]>(`/api/v1/doctor/medicines?limit=20${search ? `&search=${encodeURIComponent(search)}` : ""}`),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<Prescription>("/api/v1/doctor/prescriptions", {
        patient_id: patientId,
        diagnosis,
        advice,
        follow_up_date: followUp || null,
        items,
      }),
    onSuccess: () => {
      toast.success("Prescription issued and sent to the patient");
      queryClient.invalidateQueries({ queryKey: ["doctor"] });
      setOpen(false);
      setItems([]);
      setDiagnosis("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ClipboardList className="h-3.5 w-3.5" /> New prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Write prescription</DialogTitle>
          <DialogDescription>Medicines are checked against the district formulary.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Diagnosis</Label>
            <Input value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="Acute viral pharyngitis" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Search medicines</Label>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Paracetamol, Amoxicillin…" />
            <div className="mt-2 flex flex-wrap gap-2">
              {medicines.slice(0, 12).map((medicine) => (
                <button
                  key={medicine.id}
                  type="button"
                  onClick={() =>
                    setItems((previous) => [
                      ...previous,
                      {
                        medicine_id: medicine.id,
                        medicine_name: medicine.name,
                        dosage: "1-0-1",
                        duration_days: 5,
                        instructions: "After food",
                      },
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
          {items.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Add at least one medicine from the formulary above.</p>
          ) : (
            items.map((item, index) => (
              <div key={`${item.medicine_name}-${index}`} className="grid gap-2 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-[1.4fr_0.8fr_0.7fr_1.2fr_auto]">
                <Input
                  value={item.medicine_name}
                  onChange={(event) =>
                    setItems((previous) => previous.map((row, i) => (i === index ? { ...row, medicine_name: event.target.value } : row)))
                  }
                />
                <Input
                  value={item.dosage}
                  onChange={(event) =>
                    setItems((previous) => previous.map((row, i) => (i === index ? { ...row, dosage: event.target.value } : row)))
                  }
                  placeholder="1-0-1"
                />
                <Input
                  type="number"
                  value={item.duration_days}
                  onChange={(event) =>
                    setItems((previous) =>
                      previous.map((row, i) => (i === index ? { ...row, duration_days: Number(event.target.value) } : row))
                    )
                  }
                />
                <Input
                  value={item.instructions}
                  onChange={(event) =>
                    setItems((previous) => previous.map((row, i) => (i === index ? { ...row, instructions: event.target.value } : row)))
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove medicine"
                  onClick={() => setItems((previous) => previous.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Advice</Label>
            <Textarea value={advice} onChange={(event) => setAdvice(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Follow-up date</Label>
            <Input type="date" value={followUp} onChange={(event) => setFollowUp(event.target.value)} />
          </div>
        </div>

        <Button className="mt-6 w-full" disabled={items.length === 0 || !diagnosis.trim()} loading={create.isPending} onClick={() => create.mutate()}>
          Issue prescription
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function LabRequestDialog({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ title: "Complete Blood Count", report_type: "lab", summary: "" });

  const create = useMutation({
    mutationFn: () => api.post<Report>("/api/v1/doctor/lab-requests", { patient_id: patientId, ...form }),
    onSuccess: () => {
      toast.success("Lab investigation requested");
      queryClient.invalidateQueries({ queryKey: ["doctor"] });
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FlaskConical className="h-3.5 w-3.5" /> Request lab test
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request investigation</DialogTitle>
          <DialogDescription>The patient is notified and the request reaches the facility lab.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Investigation</Label>
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Report type</Label>
            <Select value={form.report_type} onChange={(event) => setForm({ ...form, report_type: event.target.value })}>
              {REPORT_TYPES.map((type) => (
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
          <Button className="w-full" loading={create.isPending} onClick={() => create.mutate()}>
            Send request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PatientChartPage() {
  const params = useParams<{ id: string }>();
  const patientId = Number(params.id);

  const { data, isLoading } = useQuery({
    queryKey: ["doctor", "patient-history", patientId],
    queryFn: () => api.get<HistoryPayload>(`/api/v1/doctor/patients/${patientId}/history`),
  });

  if (isLoading || !data) return <LoadingBlock rows={6} />;

  const { patient } = data;

  return (
    <>
      <PageHeader
        title={patient.full_name}
        description={`${patient.health_id} · ${patient.age} yrs · ${titleCase(patient.gender)} · ${patient.blood_group} · ${patient.locality}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/doctor/patients">
                <ArrowLeft className="h-4 w-4" /> Back
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/chat">
                <MessageSquare className="h-4 w-4" /> Message
              </Link>
            </Button>
            <NewReferralModal
              defaultPatientId={patientId}
              triggerButton={
                <Button size="sm" variant="outline">
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Refer to doctor
                </Button>
              }
            />
            <LabRequestDialog patientId={patientId} />
            <PrescriptionDialog patientId={patientId} />
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Risk level", patient.risk_level],
          ["Health score", String(patient.health_score)],
          ["Chronic conditions", patient.chronic_conditions || "None"],
          ["Allergies", patient.allergies || "None"],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
              <p className={cn("mt-1 text-sm font-semibold", label === "Allergies" && patient.allergies ? "text-[var(--danger)]" : "")}>
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="visits">
        <TabsList>
          <TabsTrigger value="visits">Consultations ({data.appointments.length})</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions ({data.prescriptions.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({data.reports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-3">
          {data.appointments.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No consultations" description="Consultations with this patient appear here." />
          ) : (
            data.appointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-semibold">{appointment.reason}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {appointment.doctor_name} · {appointment.hospital_name} · {formatDate(appointment.scheduled_at, true)}
                    </p>
                    {appointment.diagnosis ? <p className="mt-1 text-sm">Diagnosis: {appointment.diagnosis}</p> : null}
                    {appointment.notes ? <p className="text-xs text-[var(--muted-foreground)]">{appointment.notes}</p> : null}
                  </div>
                  <Badge tone={appointment.status === "completed" ? "success" : "primary"}>{titleCase(appointment.status)}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-3">
          {data.prescriptions.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No prescriptions" description="Issue a prescription using the button above." />
          ) : (
            data.prescriptions.map((prescription) => (
              <Card key={prescription.id}>
                <CardHeader>
                  <CardTitle className="text-base">{prescription.diagnosis || "Consultation"}</CardTitle>
                  <CardDescription>
                    {prescription.doctor_name} · issued {formatDate(prescription.issued_on)}
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
            ))
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-3">
          {data.reports.length === 0 ? (
            <EmptyState icon={FlaskConical} title="No reports" description="Lab and radiology reports appear here." />
          ) : (
            data.reports.map((report) => (
              <Card key={report.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-semibold">{report.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {titleCase(report.report_type)} · {report.hospital_name} · {formatDate(report.report_date)}
                    </p>
                    <p className="mt-1 text-sm">{report.summary}</p>
                  </div>
                  <Badge tone={report.is_abnormal ? "danger" : "success"}>{report.is_abnormal ? "Abnormal" : "Normal"}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
