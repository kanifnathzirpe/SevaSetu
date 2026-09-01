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
import { useI18n } from "@/lib/i18n";
import type { DoctorDashboard } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

const QUICK_ACTIONS = [
  { labelKey: "doctor.patientQueue", href: "/doctor/queue", icon: ListOrdered },
  { labelKey: "doctor.writePrescription", href: "/doctor/prescriptions", icon: ClipboardList },
  { labelKey: "doctor.requestLabTest", href: "/doctor/lab-requests", icon: Stethoscope },
  { labelKey: "doctor.myPatients", href: "/doctor/patients", icon: Users },
];

export default function DoctorDashboardPage() {
  const { t } = useI18n();
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
        description={`${doctor.specialization} · ${doctor.qualification} · ${doctor.hospital_name} · ${doctor.experience_years} ${t("doctor.yearsExperience")}`}
        actions={
          <Button asChild>
            <Link href="/doctor/queue">
              <ListOrdered className="h-4 w-4" /> {t("doctor.openQueue")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("doctor.appointmentsToday")} value={stats.today_appointments} hint={`${stats.pending_today} ${t("doctor.pending")}`} icon={CalendarDays} tone="primary" index={0} />
        <StatCard label={t("doctor.completedToday")} value={stats.completed_today} hint={t("doctor.consultationsClosed")} icon={Stethoscope} tone="success" index={1} />
        <StatCard label={t("doctor.patientsTreated")} value={stats.total_patients} hint={`${stats.prescriptions_issued} ${t("doctor.prescriptionsIssued")}`} icon={Users} tone="info" index={2} />
        <StatCard label={t("doctor.teleconsultations")} value={stats.video_consultations} hint={t("doctor.videoAppointments")} icon={Video} tone="warning" index={3} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("doctor.thisWeek")}</CardTitle>
            <CardDescription>{t("doctor.scheduledVsCompleted")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={data.weekly_trend}
              xKey="day"
              series={[
                { key: "appointments", label: t("doctor.scheduled") },
                { key: "completed", label: t("doctor.completed") },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("doctor.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] p-4 text-center text-xs font-medium transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <action.icon className="h-5 w-5" />
                {t(action.labelKey)}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("doctor.upcomingConsultations")}</CardTitle>
          <CardDescription>{t("doctor.nextSixAppointments")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title={t("dashboard.noUpcoming")} description={t("doctor.newlyBookedAppts")} />
          ) : (
            data.upcoming.map((appointment) => (
              <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
                <div>
                  <p className="font-semibold">{appointment.patient_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t("doctor.token")} {appointment.token_number} · {appointment.reason}
                  </p>
                  <p className="text-xs">{formatDate(appointment.scheduled_at, true)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={appointment.appointment_type === "video" ? "info" : "default"}>
                    {titleCase(appointment.appointment_type)}
                  </Badge>
                  <Badge tone={appointment.status === "completed" ? "success" : "primary"}>{titleCase(appointment.status)}</Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/doctor/patients/${appointment.patient_id}`}>{t("doctor.openChart")}</Link>
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
