"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  CalendarDays,
  FileText,
  HeartPulse,
  Pill,
  Siren,
  Sparkles,
  Stethoscope,
  Syringe,
  Video,
} from "lucide-react";
import Link from "next/link";

import { TrendAreaChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { PatientDashboard } from "@/lib/types";
import { cn, formatDate, STATUS_STYLES } from "@/lib/utils";

interface Insight {
  title: string;
  severity: string;
  detail: string;
}

const QUICK_ACTIONS = [
  { labelKey: "dashboard.bookAppt", href: "/patient/appointments", icon: CalendarDays },
  { labelKey: "dashboard.checkSymptoms", href: "/patient/symptom-checker", icon: Activity },
  { labelKey: "dashboard.findHospital", href: "/patient/hospitals", icon: Stethoscope },
  { labelKey: "nav.emergencySOS", href: "/patient/emergency", icon: Siren },
];

export default function PatientDashboardPage() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["patient", "dashboard"],
    queryFn: () => api.get<PatientDashboard>("/api/v1/patient/dashboard"),
  });

  const { data: insights } = useQuery({
    queryKey: ["ai", "insights"],
    queryFn: () => api.get<{ insights: Insight[]; generated_on: string }>("/api/v1/ai/insights"),
  });

  if (isLoading || !data) return <LoadingBlock rows={6} />;

  const { patient, stats } = data;

  return (
    <>
      <PageHeader
        title={`${t("dashboard.greeting")}, ${patient.full_name.split(" ")[0]}`}
        description={`Health ID ${patient.health_id} · ${patient.locality} · ABHA ${patient.abha_number ?? t("dashboard.notLinked")}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/patient/health-card">{t("dashboard.digitalCard")}</Link>
            </Button>
            <Button asChild>
              <Link href="/patient/appointments">
                <CalendarDays className="h-4 w-4" /> {t("dashboard.bookAppointment")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dashboard.healthScore")} value={stats.health_score} hint={t("dashboard.compositeIdx")} icon={HeartPulse} tone="primary" index={0} />
        <StatCard label={t("dashboard.bmi")} value={stats.bmi} hint={`${patient.height_cm} cm · ${patient.weight_kg} kg`} icon={Activity} tone="info" index={1} />
        <StatCard label={t("dashboard.upcomingVisits")} value={stats.upcoming_appointments} hint={t("dashboard.next30")} icon={CalendarDays} tone="success" index={2} />
        <StatCard label={t("dashboard.activeRemind")} value={stats.active_reminders} hint={`${stats.pending_vaccinations} ${t("dashboard.vaccDue")}`} icon={Bell} tone="warning" index={3} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.vitalsTrend")}</CardTitle>
            <CardDescription>{t("dashboard.vitalsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart
              data={data.vitals_trend}
              xKey="date"
              series={[
                { key: "systolic", label: t("dashboard.systolic") },
                { key: "diastolic", label: t("dashboard.diastolic") },
                { key: "sugar", label: t("dashboard.bloodSugar") },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--primary)]" /> {t("dashboard.aiInsights")}
            </CardTitle>
            <CardDescription>{t("dashboard.aiInsightsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(insights?.insights ?? []).map((insight) => (
              <div key={insight.title} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <Badge tone={insight.severity === "critical" || insight.severity === "high" ? "danger" : insight.severity === "warning" || insight.severity === "moderate" ? "warning" : "success"}>
                    {insight.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{insight.detail}</p>
              </div>
            ))}
            {insights && insights.insights.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">{t("dashboard.noAlerts")}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.upcomingAppts")}</CardTitle>
            <CardDescription>{t("dashboard.upcomingDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcoming_appointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={t("dashboard.noUpcoming")}
                description={t("dashboard.bookConsult")}
                action={
                  <Button asChild size="sm">
                    <Link href="/patient/appointments">{t("dashboard.bookNow")}</Link>
                  </Button>
                }
              />
            ) : (
              data.upcoming_appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4"
                >
                  <div>
                    <p className="font-semibold">{appointment.doctor_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {appointment.specialization} · {appointment.hospital_name}
                    </p>
                    <p className="mt-1 text-sm">{formatDate(appointment.scheduled_at, true)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", STATUS_STYLES[appointment.status])}>
                      {appointment.status.replace("_", " ")}
                    </span>
                    {appointment.appointment_type === "video" ? (
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/video/${appointment.video_room_id ?? `appt-${appointment.id}`}?appointment=${appointment.id}`}>
                          <Video className="h-3.5 w-3.5" /> {t("dashboard.join")}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col gap-2 rounded-xl border border-[var(--border)] p-3 transition-colors hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                >
                  <action.icon className="h-4 w-4 text-[var(--primary)]" />
                  <span className="text-xs font-medium">{t(action.labelKey)}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.medicinesTitle")}</CardTitle>
              <CardDescription>{t("dashboard.medicinesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.medicine_reminders.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">{t("dashboard.noReminders")}</p>
              ) : (
                data.medicine_reminders.slice(0, 4).map((reminder) => (
                  <div key={reminder.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <Pill className="h-3.5 w-3.5 text-[var(--primary)]" /> {reminder.medicine_name}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">{reminder.times_of_day}</span>
                    </div>
                    <Progress className="mt-2" value={reminder.adherence_percent} />
                  </div>
                ))
              )}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/patient/reminders">{t("dashboard.manageReminders")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentReports")}</CardTitle>
            <CardDescription>{t("dashboard.reportsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_reports.length === 0 ? (
              <EmptyState icon={FileText} title={t("dashboard.noReports")} description={t("dashboard.reportsHint")} />
            ) : (
              data.recent_reports.map((report) => (
                <Link
                  key={report.id}
                  href="/patient/reports"
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3 transition-colors hover:border-[var(--primary)]"
                >
                  <div>
                    <p className="text-sm font-semibold">{report.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDate(report.report_date)}</p>
                  </div>
                  <Badge tone={report.is_abnormal ? "danger" : "success"}>
                    {report.is_abnormal ? t("dashboard.abnormal") : t("dashboard.normal")}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.vaccinationsTitle")}</CardTitle>
            <CardDescription>{t("dashboard.vaccinationsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.vaccinations_due.length === 0 ? (
              <EmptyState icon={Syringe} title={t("dashboard.allCaughtUp")} description={t("dashboard.noPendingVacc")} />
            ) : (
              data.vaccinations_due.map((vaccination) => (
                <div key={vaccination.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {vaccination.vaccine_name} · {vaccination.dose_label}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {vaccination.center_name} · {formatDate(vaccination.scheduled_date)}
                    </p>
                  </div>
                  <Badge tone={vaccination.status === "overdue" ? "danger" : "warning"}>{vaccination.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
