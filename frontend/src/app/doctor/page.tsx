"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, ListOrdered, Stethoscope, Users, Video } from "lucide-react";
import Link from "next/link";

import { SimpleBarChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { DoctorDashboard } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "Patient queue", href: "/doctor/queue", icon: ListOrdered },
  { label: "Write prescription", href: "/doctor/prescriptions", icon: ClipboardList },
  { label: "Request lab test", href: "/doctor/lab-requests", icon: Stethoscope },
  { label: "My patients", href: "/doctor/patients", icon: Users },
];

export default function DoctorDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["doctor", "dashboard"],
    queryFn: () => api.get<DoctorDashboard>("/api/v1/doctor/dashboard"),
  });

  if (isLoading || !data) return <LoadingBlock rows={6} />;

  const { doctor, stats } = data;

  return (
    <>
      <PageHeader
        title={`Dr. ${doctor.full_name.replace(/^Dr\.?\s*/i, "")}`}
        description={`${doctor.specialization} · ${doctor.qualification} · ${doctor.hospital_name} · ${doctor.experience_years} years experience`}
        actions={
          <Button asChild>
            <Link href="/doctor/queue">
              <ListOrdered className="h-4 w-4" /> Open queue
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Appointments today" value={stats.today_appointments} hint={`${stats.pending_today} pending`} icon={CalendarDays} tone="primary" index={0} />
        <StatCard label="Completed today" value={stats.completed_today} hint="Consultations closed" icon={Stethoscope} tone="success" index={1} />
        <StatCard label="Patients treated" value={stats.total_patients} hint={`${stats.prescriptions_issued} prescriptions issued`} icon={Users} tone="info" index={2} />
        <StatCard label="Teleconsultations" value={stats.video_consultations} hint="Video appointments" icon={Video} tone="warning" index={3} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <CardDescription>Scheduled versus completed consultations</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={data.weekly_trend}
              xKey="day"
              series={[
                { key: "appointments", label: "Scheduled" },
                { key: "completed", label: "Completed" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] p-4 text-center text-xs font-medium transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <action.icon className="h-5 w-5" />
                {action.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Upcoming consultations</CardTitle>
          <CardDescription>Next six appointments across all facilities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming appointments" description="Newly booked appointments appear here." />
          ) : (
            data.upcoming.map((appointment) => (
              <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
                <div>
                  <p className="font-semibold">{appointment.patient_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Token {appointment.token_number} · {appointment.reason}
                  </p>
                  <p className="text-xs">{formatDate(appointment.scheduled_at, true)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={appointment.appointment_type === "video" ? "info" : "default"}>
                    {titleCase(appointment.appointment_type)}
                  </Badge>
                  <Badge tone={appointment.status === "completed" ? "success" : "primary"}>{titleCase(appointment.status)}</Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/doctor/patients/${appointment.patient_id}`}>Open chart</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
