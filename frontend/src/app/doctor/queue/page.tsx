"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListOrdered, PlayCircle, Timer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

interface QueuePayload {
  date: string;
  now_serving: Appointment | null;
  waiting: Appointment[];
  completed: Appointment[];
  average_wait_minutes: number;
}

export default function DoctorQueuePage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["doctor", "queue"],
    queryFn: () => api.get<QueuePayload>("/api/v1/doctor/queue"),
    refetchInterval: 20_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["doctor"] });

  const call = useMutation({
    mutationFn: (id: number) => api.post<Appointment>(`/api/v1/doctor/queue/${id}/call`),
    onSuccess: (appointment) => {
      toast.success(`Now serving ${appointment.patient_name}`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const complete = useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/appointments/${id}/complete`),
    onSuccess: () => {
      toast.success("Consultation completed");
      invalidate();
    },
  });

  if (isLoading || !data) return <LoadingBlock rows={5} />;

  return (
    <>
      <PageHeader title="Queue management" description={`Live OPD queue for ${formatDate(data.date)}`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Waiting" value={data.waiting.length} hint="Patients in queue" icon={ListOrdered} tone="warning" index={0} />
        <StatCard label="Completed" value={data.completed.length} hint="Seen today" icon={CheckCircle2} tone="success" index={1} />
        <StatCard label="Average wait" value={`${data.average_wait_minutes} min`} hint="Estimated" icon={Timer} tone="info" index={2} />
      </div>

      <Card className="mt-4 border-[var(--primary)]">
        <CardHeader>
          <CardTitle>Now serving</CardTitle>
          <CardDescription>Current consultation in progress</CardDescription>
        </CardHeader>
        <CardContent>
          {data.now_serving ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-bold">{data.now_serving.patient_name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Token {data.now_serving.token_number} · {data.now_serving.reason}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/doctor/patients/${data.now_serving.patient_id}`}>Open chart</Link>
                </Button>
                <Button size="sm" onClick={() => complete.mutate(data.now_serving!.id)}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No consultation in progress. Call the next patient below.</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Waiting ({data.waiting.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.waiting.length === 0 ? (
              <EmptyState icon={ListOrdered} title="Queue is empty" description="Checked-in patients appear here in token order." />
            ) : (
              data.waiting.map((appointment) => (
                <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
                  <div>
                    <p className="font-semibold">
                      #{appointment.token_number} · {appointment.patient_name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {appointment.reason} · {formatDate(appointment.scheduled_at, true)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={appointment.status === "checked_in" ? "success" : "default"}>{titleCase(appointment.status)}</Badge>
                    <Button size="sm" variant="outline" loading={call.isPending} onClick={() => call.mutate(appointment.id)}>
                      <PlayCircle className="h-3.5 w-3.5" /> Call in
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed ({data.completed.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.completed.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing completed yet" description="Completed consultations appear here." />
            ) : (
              data.completed.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--muted)] p-3 text-sm">
                  <span>
                    #{appointment.token_number} {appointment.patient_name}
                  </span>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/doctor/patients/${appointment.patient_id}`}>Chart</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
