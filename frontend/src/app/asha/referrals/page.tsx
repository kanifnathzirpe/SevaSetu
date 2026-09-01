"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
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
import type { Hospital, Patient, Referral } from "@/lib/types";
import { cn, formatDate, RISK_STYLES, titleCase } from "@/lib/utils";

export default function AshaReferralsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ patient_id: 0, to_hospital_id: 0, reason: "", urgency: "moderate", notes: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["asha", "referrals"],
    queryFn: () => api.get<Referral[]>("/api/v1/asha/referrals"),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["asha", "patients"],
    queryFn: () => api.get<Patient[]>("/api/v1/asha/patients"),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => api.get<Hospital[]>("/api/v1/hospitals"),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<Referral>("/api/v1/asha/referrals", {
        patient_id: Number(form.patient_id),
        to_hospital_id: form.to_hospital_id ? Number(form.to_hospital_id) : null,
        reason: form.reason,
        urgency: form.urgency,
        notes: form.notes,
      }),
    onSuccess: () => {
      toast.success("Referral created and the patient has been notified");
      queryClient.invalidateQueries({ queryKey: ["asha", "referrals"] });
      setOpen(false);
      setForm({ patient_id: 0, to_hospital_id: 0, reason: "", urgency: "moderate", notes: "" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        title="Referrals"
        description="Escalate patients from the sub-centre to PHCs, rural or district hospitals"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New referral
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create referral</DialogTitle>
                <DialogDescription>The patient and the receiving facility are notified instantly.</DialogDescription>
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
                  <Label>Refer to</Label>
                  <Select value={form.to_hospital_id} onChange={(event) => setForm({ ...form, to_hospital_id: Number(event.target.value) })}>
                    <option value={0}>Nearest district facility</option>
                    {hospitals.map((hospital) => (
                      <option key={hospital.id} value={hospital.id}>
                        {hospital.name} — {hospital.locality}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Urgency</Label>
                  <Select value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value })}>
                    {["low", "moderate", "high", "critical"].map((level) => (
                      <option key={level} value={level}>
                        {titleCase(level)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Severe anaemia (Hb 7.2) in 28-week pregnancy" />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                </div>
                <Button
                  className="w-full"
                  disabled={!form.patient_id || !form.reason.trim()}
                  loading={create.isPending}
                  onClick={() => create.mutate()}
                >
                  Create referral
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={FileText} title="No referrals yet" description="Referrals you create appear here with their status." />
      ) : (
        <div className="space-y-3">
          {data.map((referral) => (
            <Card key={referral.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold">{referral.patient_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {referral.from_facility} → {referral.to_hospital_name ?? "District facility"} · {formatDate(referral.created_at)}
                  </p>
                  <p className="mt-1 text-sm">{referral.reason}</p>
                  {referral.notes ? <p className="text-xs text-[var(--muted-foreground)]">{referral.notes}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold capitalize", RISK_STYLES[referral.urgency])}>
                    {referral.urgency}
                  </span>
                  <Badge tone={referral.status === "closed" ? "success" : referral.status === "accepted" ? "info" : "warning"}>
                    {titleCase(referral.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
