"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Appointment, VideoSession } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

interface WebrtcConfig {
  ice_servers: { urls: string }[];
  signalling_url: string;
  media_constraints: Record<string, unknown>;
  features: Record<string, unknown>;
}

export default function PatientVideoPage() {
  const router = useRouter();

  const { data = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.get<Appointment[]>("/api/v1/appointments"),
  });

  const { data: config } = useQuery({
    queryKey: ["video", "config"],
    queryFn: () => api.get<WebrtcConfig>("/api/v1/video/config"),
  });

  const start = useMutation({
    mutationFn: (appointment: Appointment) =>
      api.post<VideoSession>("/api/v1/video/sessions", { appointment_id: appointment.id }),
    onSuccess: (session) => router.push(`/video/${session.room_id}`),
    onError: (error: Error) => toast.error(error.message),
  });

  const videoAppointments = data.filter((item) => item.appointment_type === "video" && item.status !== "cancelled");

  return (
    <>
      <PageHeader
        title="Video consultations"
        description="Teleconsultation rooms for your scheduled online appointments"
      />

      {isLoading ? (
        <LoadingBlock />
      ) : videoAppointments.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No video consultations scheduled"
          description="Book an appointment and choose 'Video consultation' as the type."
          action={
            <Button onClick={() => router.push("/patient/appointments")}>
              <CalendarDays className="h-4 w-4" /> Book one
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {videoAppointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold">{appointment.doctor_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {appointment.specialization} · {appointment.hospital_name}
                  </p>
                  <p className="mt-1 text-sm">{formatDate(appointment.scheduled_at, true)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={appointment.status === "completed" ? "success" : "primary"}>
                    {titleCase(appointment.status)}
                  </Badge>
                  <Button size="sm" loading={start.isPending} onClick={() => start.mutate(appointment)}>
                    <Video className="h-3.5 w-3.5" /> Enter room
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {config ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Connection readiness</CardTitle>
            <CardDescription>WebRTC configuration used by the SevaSetu consultation client</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--muted)] p-4 text-sm">
              <p className="font-semibold">STUN servers</p>
              <ul className="mt-1 space-y-1 text-xs text-[var(--muted-foreground)]">
                {config.ice_servers.map((server) => (
                  <li key={server.urls}>{server.urls}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-[var(--muted)] p-4 text-sm">
              <p className="font-semibold">In-call features</p>
              <ul className="mt-1 space-y-1 text-xs text-[var(--muted-foreground)]">
                {Object.entries(config.features).map(([key, value]) => (
                  <li key={key}>
                    {titleCase(key)}: {String(value)}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
