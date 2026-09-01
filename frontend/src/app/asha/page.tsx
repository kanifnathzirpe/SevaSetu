"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Baby, CalendarDays, CheckCircle2, CloudUpload, Home, Syringe, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { SimpleBarChart } from "@/components/charts";
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
import type { AshaDashboard } from "@/lib/types";
import { cn, formatDate, RISK_STYLES, titleCase } from "@/lib/utils";

export default function AshaDashboardPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["asha", "dashboard"],
    queryFn: () => api.get<AshaDashboard>("/api/v1/asha/dashboard"),
  });

  const complete = useMutation({
    mutationFn: (visitId: number) => api.post(`/api/v1/asha/visits/${visitId}/complete`),
    onSuccess: () => {
      toast.success(t("asha.visitMarkedComplete"));
      queryClient.invalidateQueries({ queryKey: ["asha"] });
    },
  });

  const sync = useMutation({
    mutationFn: () => api.post<{ message: string }>("/api/v1/asha/sync"),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: ["asha"] });
    },
  });

  if (isLoading || !data) return <LoadingBlock rows={6} />;

  const { asha, stats } = data;

  return (
    <>
      <PageHeader
        title={`${t("asha.greeting")}, ${asha.name.split(" ")[0]}`}
        description={`ASHA ${asha.asha_code} · ${asha.assigned_area} · ${asha.village_or_ward} · ${t("asha.supervisor")} ${asha.supervisor_name}`}
        actions={
          <>
            <Button variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}>
              <CloudUpload className="h-4 w-4" /> {t("asha.syncOffline")} ({stats.pending_sync})
            </Button>
            <Button asChild>
              <Link href="/asha/visits">
                <CalendarDays className="h-4 w-4" /> {t("asha.planVisit")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("asha.households")} value={stats.households} hint={`${stats.assigned_patients} ${t("asha.registeredPatients")}`} icon={Home} tone="primary" index={0} />
        <StatCard label={t("asha.visitsToday")} value={`${stats.completed_today}/${stats.visits_today}`} hint={`${stats.target_completion_percent}${t("asha.percentOfTarget")}`} icon={CalendarDays} tone="success" index={1} />
        <StatCard label={t("asha.pregnanciesTracked")} value={stats.pregnancies_tracked} hint={`${stats.high_risk_cases} ${t("asha.highRiskCases")}`} icon={Baby} tone="warning" index={2} />
        <StatCard label={t("asha.immunisationsDue")} value={stats.vaccinations_due} hint={t("asha.childrenInWard")} icon={Syringe} tone="info" index={3} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("asha.weeklyActivity")}</CardTitle>
            <CardDescription>{t("asha.plannedVsCompleted")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={data.weekly_trend}
              xKey="day"
              series={[
                { key: "planned", label: t("asha.planned") },
                { key: "completed", label: t("asha.complete") },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("asha.dailyTarget")}</CardTitle>
            <CardDescription>{asha.daily_visit_target} {t("asha.visitsPerDay")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Progress value={stats.target_completion_percent} className="flex-1" />
              <span className="text-sm font-semibold">{stats.target_completion_percent}%</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-[var(--muted)] p-3">
                <p className="text-2xl font-bold">{stats.completed_today}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t("asha.complete")}</p>
              </div>
              <div className="rounded-xl bg-[var(--muted)] p-3">
                <p className="text-2xl font-bold">{Math.max(0, asha.daily_visit_target - stats.completed_today)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t("asha.remaining")}</p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/asha/targets">{t("asha.viewAllTargets")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("asha.todaysVisits")}</CardTitle>
            <CardDescription>{formatDate(new Date())}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.today_visits.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={t("asha.noVisitsPlanned")}
                description={t("asha.planHouseholdVisits")}
                action={
                  <Button asChild size="sm">
                    <Link href="/asha/visits">{t("asha.planVisitsBtn")}</Link>
                  </Button>
                }
              />
            ) : (
              data.today_visits.map((visit) => (
                <div key={visit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
                  <div>
                    <p className="font-semibold">{visit.household_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {visit.locality} · {visit.purpose}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={visit.status === "completed" ? "success" : visit.status === "missed" ? "danger" : "warning"}>
                      {titleCase(visit.status)}
                    </Badge>
                    {visit.status !== "completed" ? (
                      <Button size="sm" variant="outline" onClick={() => complete.mutate(visit.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("asha.complete")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--danger)]" /> {t("asha.highRiskTitle")}
            </CardTitle>
            <CardDescription>{t("asha.escalate")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.high_risk.length === 0 ? (
              <EmptyState icon={Users} title={t("asha.noHighRisk")} description={t("asha.allTrackedSafe")} />
            ) : (
              data.high_risk.map((record) => (
                <div key={record.id} className="rounded-xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{record.patient_name}</p>
                    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold capitalize", RISK_STYLES[record.risk_level])}>
                      {record.risk_level}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {t("asha.week")} {record.gestation_weeks} · Hb {record.hemoglobin} g/dL · BP {record.bp_systolic}/{record.bp_diastolic} · ANC {record.anc_visits_completed}/4
                  </p>
                  {record.notes ? <p className="mt-1 text-xs text-[var(--danger)]">{record.notes}</p> : null}
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link href="/asha/pregnancies">{t("asha.recordAnc")}</Link>
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
