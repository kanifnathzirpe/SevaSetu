"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Video, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { Appointment, Doctor } from "@/lib/types";
import { cn, formatDate, STATUS_STYLES } from "@/lib/utils";

interface SpecializationOption {
  specialization: string;
  doctor_count: number;
}

interface Slots {
  date: string;
  doctor_id: number;
  slots: { time: string; available: boolean }[];
}

function BookingDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [specialization, setSpecialization] = React.useState("");
  const [doctorId, setDoctorId] = React.useState<number | null>(null);
  const [date, setDate] = React.useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [slot, setSlot] = React.useState("");
  const [type, setType] = React.useState("in_person");
  const [reason, setReason] = React.useState("");

  const { data: specializations = [] } = useQuery({
    queryKey: ["doctors", "specializations"],
    queryFn: () => api.get<SpecializationOption[]>("/api/v1/doctors/specializations"),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", specialization],
    queryFn: () =>
      api.get<Doctor[]>(`/api/v1/doctors${specialization ? `?specialization=${encodeURIComponent(specialization)}` : ""}`),
  });

  const { data: slots } = useQuery({
    queryKey: ["doctors", doctorId, "slots", date],
    queryFn: () => api.get<Slots>(`/api/v1/doctors/${doctorId}/slots?on=${date}`),
    enabled: Boolean(doctorId),
  });

  const book = useMutation({
    mutationFn: () =>
      api.post<Appointment>("/api/v1/appointments", {
        doctor_id: doctorId,
        scheduled_at: `${date}T${slot}:00`,
        appointment_type: type,
        reason,
      }),
    onSuccess: () => {
      toast.success("Appointment booked");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patient", "dashboard"] });
      setOpen(false);
      setSlot("");
      setReason("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Book appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book a consultation</DialogTitle>
          <DialogDescription>Choose a medical officer and an available slot.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select
              value={specialization}
              onChange={(event) => {
                setSpecialization(event.target.value);
                setDoctorId(null);
              }}
            >
              <option value="">All departments</option>
              {specializations.map((item) => (
                <option key={item.specialization} value={item.specialization}>
                  {item.specialization} ({item.doctor_count})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Doctor</Label>
            <Select value={doctorId ?? ""} onChange={(event) => setDoctorId(Number(event.target.value) || null)}>
              <option value="">Select a doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name} — {doctor.hospital_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Consultation type</Label>
            <Select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="in_person">In person</option>
              <option value="video">Video consultation</option>
              <option value="home_visit">Home visit</option>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Reason for visit</Label>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Fever and body ache for 3 days" />
          </div>
          <div className="sm:col-span-2">
            <Label>Available slots</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {!doctorId && <p className="text-sm text-[var(--muted-foreground)]">Select a doctor to see slots.</p>}
              {(slots?.slots ?? []).map((item) => (
                <button
                  key={item.time}
                  type="button"
                  disabled={!item.available}
                  onClick={() => setSlot(item.time)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    slot === item.time
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : item.available
                        ? "border-[var(--border)] hover:border-[var(--primary)]"
                        : "cursor-not-allowed border-dashed border-[var(--border)] text-[var(--muted-foreground)] line-through"
                  )}
                >
                  {item.time}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          className="mt-6 w-full"
          disabled={!doctorId || !slot}
          loading={book.isPending}
          onClick={() => book.mutate()}
        >
          Confirm appointment
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const queryClient = useQueryClient();

  const cancel = useMutation({
    mutationFn: () => api.post(`/api/v1/appointments/${appointment.id}/cancel`),
    onSuccess: () => {
      toast.success("Appointment cancelled");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const checkIn = useMutation({
    mutationFn: () => api.post(`/api/v1/appointments/${appointment.id}/check-in`),
    onSuccess: () => {
      toast.success(`Checked in — token ${appointment.token_number}`);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const upcoming = new Date(appointment.scheduled_at) > new Date();

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-56">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{appointment.doctor_name}</p>
            <Badge tone="primary">Token {appointment.token_number}</Badge>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {appointment.specialization} · {appointment.hospital_name}
          </p>
          <p className="mt-1 text-sm">{formatDate(appointment.scheduled_at, true)}</p>
          {appointment.reason ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{appointment.reason}</p> : null}
          {appointment.diagnosis ? (
            <p className="mt-1 text-xs text-[var(--primary)]">Diagnosis: {appointment.diagnosis}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", STATUS_STYLES[appointment.status])}>
            {appointment.status.replace("_", " ")}
          </span>
          {appointment.appointment_type === "video" && appointment.status !== "cancelled" ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/video/${appointment.video_room_id ?? `appt-${appointment.id}`}?appointment=${appointment.id}`}>
                <Video className="h-3.5 w-3.5" /> Join call
              </Link>
            </Button>
          ) : null}
          {upcoming && appointment.status === "scheduled" ? (
            <>
              <Button size="sm" variant="outline" loading={checkIn.isPending} onClick={() => checkIn.mutate()}>
                Check in
              </Button>
              <Button size="sm" variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate()}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PatientAppointmentsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.get<Appointment[]>("/api/v1/appointments"),
  });

  const now = Date.now();
  const upcoming = data.filter((item) => new Date(item.scheduled_at).getTime() >= now && item.status !== "cancelled");
  const past = data.filter((item) => new Date(item.scheduled_at).getTime() < now || item.status === "completed");
  const cancelled = data.filter((item) => item.status === "cancelled");

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Consultations booked across Pune district government facilities"
        actions={<BookingDialog />}
      />

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
          </TabsList>
          {[
            ["upcoming", upcoming],
            ["past", past],
            ["cancelled", cancelled],
          ].map(([key, list]) => (
            <TabsContent key={key as string} value={key as string} className="space-y-3">
              {(list as Appointment[]).length === 0 ? (
                <EmptyState icon={CalendarDays} title="Nothing here yet" description="Your appointments will appear in this tab." />
              ) : (
                (list as Appointment[]).map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </>
  );
}
