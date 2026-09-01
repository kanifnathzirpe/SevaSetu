"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Appointment, VideoSession } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

export default function DoctorAppointmentsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = React.useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["doctor", "appointments", date, status],
    queryFn: () =>
      api.get<Appointment[]>(
        `/api/v1/doctor/appointments?${new URLSearchParams({ on: date, ...(status ? { status } : {}) })}`
      ),
  });

  const complete = useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/appointments/${id}/complete`),
    onSuccess: () => {
      toast.success("Consultation completed");
      queryClient.invalidateQueries({ queryKey: ["doctor"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startVideo = useMutation({
    mutationFn: (id: number) => api.post<VideoSession>("/api/v1/video/sessions", { appointment_id: id }),
    onSuccess: (session) => router.push(`/video/${session.room_id}`),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader title="Appointments" description="Your consultation schedule with patient details and actions" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-48" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select id="status" value={status} onChange={(event) => setStatus(event.target.value)} className="w-48">
            <option value="">All statuses</option>
            {["scheduled", "checked_in", "in_progress", "completed", "cancelled", "no_show"].map((item) => (
              <option key={item} value={item}>
                {titleCase(item)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No appointments" description="Nothing scheduled for the selected filters." />
      ) : (
        <div className="space-y-3">
          {data.map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--muted)] text-xs">
                    <span className="text-[10px] uppercase text-[var(--muted-foreground)]">Token</span>
                    <span className="text-sm font-bold">{appointment.token_number}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{appointment.patient_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {appointment.reason} · {appointment.hospital_name}
                    </p>
                    <p className="text-xs">{formatDate(appointment.scheduled_at, true)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={appointment.appointment_type === "video" ? "info" : "default"}>
                    {titleCase(appointment.appointment_type)}
                  </Badge>
                  <Badge
                    tone={
                      appointment.status === "completed"
                        ? "success"
                        : appointment.status === "cancelled"
                          ? "danger"
                          : appointment.status === "in_progress"
                            ? "warning"
                            : "primary"
                    }
                  >
                    {titleCase(appointment.status)}
                  </Badge>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/doctor/patients/${appointment.patient_id}`}>Chart</Link>
                  </Button>
                  {appointment.appointment_type === "video" && appointment.status !== "cancelled" ? (
                    <Button size="sm" variant="outline" onClick={() => startVideo.mutate(appointment.id)}>
                      <Video className="h-3.5 w-3.5" /> Start call
                    </Button>
                  ) : null}
                  {!["completed", "cancelled"].includes(appointment.status) ? (
                    <Button size="sm" onClick={() => complete.mutate(appointment.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
