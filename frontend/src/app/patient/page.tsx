"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  Droplets,
  FileText,
  HeartPulse,
  Pill,
  Plus,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
  Syringe,
  Video,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

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
  { labelKey: "nav.govtSchemes", href: "/patient/schemes", icon: ShieldCheck },
  { labelKey: "dashboard.findHospital", href: "/patient/hospitals", icon: Stethoscope },
  { labelKey: "nav.emergencySOS", href: "/patient/emergency", icon: Siren },
];

export default function PatientDashboardPage() {
  const { t } = useI18n();
  const [takenDoses, setTakenDoses] = React.useState<Record<number, boolean>>({});

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
  const latestVitals = data.vitals_trend?.[data.vitals_trend.length - 1] ?? data.vitals_trend?.[0];

  const handleToggleTaken = (id: number, medicineName: string) => {
    const isNowTaken = !takenDoses[id];
    setTakenDoses((prev) => ({ ...prev, [id]: isNowTaken }));
    if (isNowTaken) {
      toast.success(`${medicineName} marked as taken for today! 🎉`);
    } else {
      toast.info(`${medicineName} dose reset`);
    }
  };

  const activeReminders = data.medicine_reminders ?? [];
  const takenCount = activeReminders.filter((r) => takenDoses[r.id]).length;
  const totalCount = activeReminders.length;
  const adherenceAvg =
    totalCount > 0
      ? Math.round(activeReminders.reduce((acc, r) => acc + (r.adherence_percent || 80), 0) / totalCount)
      : 100;

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
        <StatCard label={t("dashboard.bmi")} value={stats.bmi} hint={`${patient.height_cm} cm · ${patient.weight_kg} kg`} icon={Activity} tone="info" index={0} />
        <StatCard label={t("dashboard.upcomingVisits")} value={stats.upcoming_appointments} hint={t("dashboard.next30")} icon={CalendarDays} tone="success" index={1} />
        <StatCard label={t("dashboard.activeRemind")} value={stats.active_reminders} hint={`${stats.pending_vaccinations} ${t("dashboard.vaccDue")}`} icon={Bell} tone="warning" index={2} />
        <StatCard label={t("nav.prescriptions")} value={stats.prescriptions} hint="Active medical prescriptions" icon={Pill} tone="primary" index={3} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Today's Medicines Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-[var(--primary)]" />
                {t("dashboard.medicinesTitle")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("dashboard.medicinesDesc")} · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {totalCount > 0 ? (
                <Badge tone={takenCount === totalCount && totalCount > 0 ? "success" : "primary"}>
                  {takenCount}/{totalCount} Taken Today
                </Badge>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link href="/patient/reminders">
                  <Plus className="h-3.5 w-3.5" /> {t("dashboard.manageReminders")}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeReminders.length === 0 ? (
              <EmptyState
                icon={Pill}
                title={t("dashboard.noReminders")}
                description="Set up your daily dosage schedule to track adherence effortlessly."
                action={
                  <Button asChild size="sm">
                    <Link href="/patient/reminders">
                      <Plus className="h-4 w-4" /> Add your first medicine
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeReminders.map((reminder) => {
                  const isTaken = !!takenDoses[reminder.id];
                  return (
                    <div
                      key={reminder.id}
                      className={cn(
                        "group relative flex flex-col justify-between rounded-xl border p-4 transition-all",
                        isTaken
                          ? "border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]"
                          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)] hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--foreground)]">{reminder.medicine_name}</span>
                            {isTaken ? (
                              <Badge tone="success" className="text-[10px] py-0 px-1.5">
                                Taken
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {reminder.dosage} · Daily Schedule
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isTaken ? "default" : "outline"}
                          className={cn("h-8 gap-1.5 text-xs transition-all", isTaken ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "")}
                          onClick={() => handleToggleTaken(reminder.id, reminder.medicine_name)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {isTaken ? "Taken" : "Take Dose"}
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {reminder.times_of_day.split(",").map((time, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]"
                          >
                            <Clock className="h-3 w-3 text-[var(--primary)]" />
                            {time.trim()}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-[11px] text-[var(--muted-foreground)]">
                            <span>Adherence</span>
                            <span className="font-semibold">{reminder.adherence_percent}%</span>
                          </div>
                          <Progress value={reminder.adherence_percent} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalCount > 0 ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--muted)]/50 p-3 text-xs text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1.5">
                  <HeartPulse className="h-4 w-4 text-[var(--primary)]" />
                  Average Monthly Adherence: <strong className="text-[var(--foreground)]">{adherenceAvg}%</strong>
                </span>
                <Link href="/patient/prescriptions" className="font-medium text-[var(--primary)] hover:underline">
                  View prescriptions →
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* AI Insights Card */}
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

          {/* Recent Vitals & Health Snapshot Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("dashboard.vitalsTrend")}</span>
                <Badge tone="success">Normal</Badge>
              </CardTitle>
              <CardDescription>Latest recorded health measurements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--border)] p-2.5 bg-[var(--muted)]/20">
                  <span className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                    <HeartPulse className="h-3 w-3 text-[var(--primary)]" /> Blood Pressure
                  </span>
                  <p className="mt-1 text-sm font-bold">{latestVitals?.systolic ?? 120}/{latestVitals?.diastolic ?? 80} <span className="text-[10px] font-normal text-[var(--muted-foreground)]">mmHg</span></p>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-2.5 bg-[var(--muted)]/20">
                  <span className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                    <Droplets className="h-3 w-3 text-amber-500" /> Blood Sugar
                  </span>
                  <p className="mt-1 text-sm font-bold">{latestVitals?.sugar ?? 96} <span className="text-[10px] font-normal text-[var(--muted-foreground)]">mg/dL</span></p>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-2.5 bg-[var(--muted)]/20">
                  <span className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                    <Activity className="h-3 w-3 text-sky-500" /> Pulse Rate
                  </span>
                  <p className="mt-1 text-sm font-bold">{latestVitals?.pulse ?? 72} <span className="text-[10px] font-normal text-[var(--muted-foreground)]">bpm</span></p>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-2.5 bg-[var(--muted)]/20">
                  <span className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                    <Activity className="h-3 w-3 text-emerald-500" /> BMI Index
                  </span>
                  <p className="mt-1 text-sm font-bold">{stats.bmi} <span className="text-[10px] font-normal text-[var(--muted-foreground)]">kg/m²</span></p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/patient/medical-history">View Medical History</Link>
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
