"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Doctor, Hospital, Patient, Referral } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const QUICK_REASONS = [
  "Specialist cardiology evaluation & 2D-Echo",
  "Pediatric consultation for persistent fever",
  "Orthopedic assessment for joint mobility",
  "Neurology review for recurring migraines",
  "OB/GYN consultation for high-risk pregnancy",
  "Dermatology evaluation for atypical lesion",
  "General surgery second opinion",
];

export function NewReferralModal({
  defaultPatientId,
  triggerButton,
  onSuccess,
}: {
  defaultPatientId?: number;
  triggerButton?: React.ReactNode;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = React.useState("");
  const [form, setForm] = React.useState({
    patient_id: defaultPatientId || 0,
    to_doctor_id: 0,
    to_hospital_id: 0,
    specialty: "",
    reason: "",
    urgency: "moderate",
    notes: "",
  });

  // Keep default patient ID in sync if provided
  React.useEffect(() => {
    if (defaultPatientId) {
      setForm((prev) => ({ ...prev, patient_id: defaultPatientId }));
    }
  }, [defaultPatientId]);

  const { data: patients = [] } = useQuery({
    queryKey: ["doctor", "patients"],
    queryFn: () => api.get<Patient[]>("/api/v1/doctor/patients"),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.get<Doctor[]>("/api/v1/doctors?limit=100"),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => api.get<Hospital[]>("/api/v1/hospitals"),
  });

  // Extract unique specializations from available doctors
  const specializations = React.useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      if (d.specialization) set.add(d.specialization);
    });
    return Array.from(set).sort();
  }, [doctors]);

  // Filter available doctors by chosen specialty
  const filteredDoctors = React.useMemo(() => {
    if (!selectedSpecialty) return doctors;
    return doctors.filter(
      (d) => d.specialization.toLowerCase() === selectedSpecialty.toLowerCase()
    );
  }, [doctors, selectedSpecialty]);

  const create = useMutation({
    mutationFn: () =>
      api.post<Referral>("/api/v1/doctor/referrals", {
        patient_id: Number(form.patient_id),
        to_doctor_id: form.to_doctor_id ? Number(form.to_doctor_id) : null,
        to_hospital_id: form.to_hospital_id ? Number(form.to_hospital_id) : null,
        specialty: selectedSpecialty || form.specialty,
        reason: form.reason,
        urgency: form.urgency,
        notes: form.notes,
      }),
    onSuccess: () => {
      toast.success("Referral created and sent to the specialist doctor");
      queryClient.invalidateQueries({ queryKey: ["doctor", "referrals"] });
      queryClient.invalidateQueries({ queryKey: ["doctor"] });
      setOpen(false);
      setForm({
        patient_id: defaultPatientId || 0,
        to_doctor_id: 0,
        to_hospital_id: 0,
        specialty: "",
        reason: "",
        urgency: "moderate",
        notes: "",
      });
      setSelectedSpecialty("");
      onSuccess?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleDoctorChange = (doctorId: number) => {
    const doc = doctors.find((d) => d.id === doctorId);
    setForm((prev) => ({
      ...prev,
      to_doctor_id: doctorId,
      to_hospital_id: doc?.hospital_id || prev.to_hospital_id,
      specialty: doc?.specialization || prev.specialty,
    }));
    if (doc?.specialization && !selectedSpecialty) {
      setSelectedSpecialty(doc.specialization);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton ?? (
          <Button>
            <Plus className="h-4 w-4" /> Refer patient to doctor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-[var(--primary)]" />
            Refer patient to specialist doctor
          </DialogTitle>
          <DialogDescription>
            Select a patient and a colleague specialist or clinical department. Both the receiving doctor and patient will receive instant notification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Patient Selection */}
          <div className="space-y-1.5">
            <Label>Patient <span className="text-[var(--danger)]">*</span></Label>
            <Select
              value={form.patient_id}
              onChange={(e) => setForm({ ...form, patient_id: Number(e.target.value) })}
            >
              <option value={0}>Select a patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} — {p.health_id} ({p.age}y, {titleCase(p.gender)})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Specialization Filter */}
            <div className="space-y-1.5">
              <Label>Specialty / Department</Label>
              <Select
                value={selectedSpecialty}
                onChange={(e) => {
                  const spec = e.target.value;
                  setSelectedSpecialty(spec);
                  setForm((prev) => ({ ...prev, specialty: spec }));
                }}
              >
                <option value="">All Specialties</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </Select>
            </div>

            {/* Doctor Selection */}
            <div className="space-y-1.5">
              <Label>Referring to Doctor</Label>
              <Select
                value={form.to_doctor_id}
                onChange={(e) => handleDoctorChange(Number(e.target.value))}
              >
                <option value={0}>Select a specialist doctor</option>
                {filteredDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.full_name} ({doc.specialization}) — {doc.hospital_name || "Specialist"}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Facility / Hospital Selection */}
            <div className="space-y-1.5">
              <Label>Destination facility / Hospital</Label>
              <Select
                value={form.to_hospital_id}
                onChange={(e) => setForm({ ...form, to_hospital_id: Number(e.target.value) })}
              >
                <option value={0}>Hospital / Department</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.locality}
                  </option>
                ))}
              </Select>
            </div>

            {/* Urgency Level */}
            <div className="space-y-1.5">
              <Label>Urgency / Triage level <span className="text-[var(--danger)]">*</span></Label>
              <Select
                value={form.urgency}
                onChange={(e) => setForm({ ...form, urgency: e.target.value })}
              >
                <option value="low">Low (Routine follow-up)</option>
                <option value="moderate">Moderate (Review within 48h)</option>
                <option value="high">High (Priority consultation)</option>
                <option value="critical">Critical (Immediate urgent triage)</option>
              </Select>
            </div>
          </div>

          {/* Quick Reasons Chips */}
          <div className="space-y-1.5">
            <Label>Quick reason suggestions</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, reason: r }))}
                  className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Reason */}
          <div className="space-y-1.5">
            <Label>Reason for Referral <span className="text-[var(--danger)]">*</span></Label>
            <Input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Suspected cardiac arrhythmia; needs specialist echo and review"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Clinical Notes / Diagnostic Findings</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Brief summary of patient vitals, active medications, test results, or specific clinical questions..."
              rows={3}
            />
          </div>

          <Button
            className="w-full mt-2"
            disabled={!form.patient_id || !form.reason.trim()}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            <ArrowRightLeft className="h-4 w-4 mr-1.5" />
            Send Referral to Doctor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
