"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  HeartPulse,
  Pill,
  Plus,
  ShieldCheck,
  Syringe,
  FileText as HistoryIcon,
  Users,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { PatientDashboard } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const QUICK_ACTIONS = [
  { labelKey: "nav.digitalTriage", href: "/triage", icon: Activity },
  { labelKey: "nav.medicalHistory", href: "/patient/history", icon: HistoryIcon },
  { labelKey: "nav.prescriptions", href: "/patient/prescriptions", icon: Pill },
  { labelKey: "nav.govtSchemes", href: "/patient/schemes", icon: ShieldCheck },
  { labelKey: "nav.myFamily", href: "/patient/family", icon: Users },
  { labelKey: "nav.referrals", href: "/patient/referrals", icon: ArrowRightLeft },
];

export default function PatientDashboardPage() {
  const { t } = useI18n();
  const [takenDoses, setTakenDoses] = React.useState<Record<number, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["patient", "dashboard"],
    queryFn: () => api.get<PatientDashboard>("/api/v1/patient/dashboard"),
  });

  if (isLoading || !data) return <LoadingBlock rows={6} />;

  const { patient } = data;

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
            <Button asChild variant="outline" size="sm">
              <Link href="/patient/health-card">{t("dashboard.digitalCard")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/patient/appointments">
                <CalendarDays className="h-4 w-4" /> {t("dashboard.bookAppointment")}
              </Link>
            </Button>
          </>
        }
      />

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
                  {takenCount}/{totalCount} {t("dashboard.takenToday")}
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
                description={t("dashboard.setupDosage")}
                action={
                  <Button asChild size="sm">
                    <Link href="/patient/reminders">
                      <Plus className="h-4 w-4" /> {t("dashboard.addFirstMedicine")}
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
                                {t("dashboard.taken")}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {reminder.dosage} · {t("dashboard.dailySchedule")}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isTaken ? "success" : "outline"}
                          className="h-8 gap-1.5 text-xs transition-all"
                          onClick={() => handleToggleTaken(reminder.id, reminder.medicine_name)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {isTaken ? t("dashboard.taken") : t("dashboard.takeDose")}
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
                            <span>{t("dashboard.adherence")}</span>
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
                  {t("dashboard.averageMonthlyAdherence")}: <strong className="text-[var(--foreground)]">{adherenceAvg}%</strong>
                </span>
                <Link href="/patient/prescriptions" className="font-medium text-[var(--primary)] hover:underline">
                  {t("dashboard.viewPrescriptions")} →
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Quick Actions Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border)] p-4 min-h-[88px] transition-colors hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
              >
                <action.icon className="h-6 w-6 text-[var(--primary)] shrink-0" />
                <span className="text-xs font-medium text-center leading-tight">{t(action.labelKey)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3 transition-colors hover:border-[var(--primary)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{report.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDate(report.report_date)}</p>
                  </div>
                  <Badge tone={report.is_abnormal ? "danger" : "success"} className="shrink-0">
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
                <div key={vaccination.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {vaccination.vaccine_name} · {vaccination.dose_label}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {vaccination.center_name} · {formatDate(vaccination.scheduled_date)}
                    </p>
                  </div>
                  <Badge tone={vaccination.status === "overdue" ? "danger" : "warning"} className="shrink-0">{vaccination.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
