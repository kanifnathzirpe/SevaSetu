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
import type { AshaDashboard } from "@/lib/types";
import { cn, formatDate, RISK_STYLES, titleCase } from "@/lib/utils";

export default function AshaDashboardPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["asha", "dashboard"],
    queryFn: () => api.get<AshaDashboard>("/api/v1/asha/dashboard"),
  });

  const complete = useMutation({
    mutationFn: (visitId: number) => api.post(`/api/v1/asha/visits/${visitId}/complete`),
    onSuccess: () => {
      toast.success("Visit marked complete");
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
        title={`Namaskar, ${asha.name.split(" ")[0]}`}
        description={`ASHA ${asha.asha_code} · ${asha.assigned_area} · ${asha.village_or_ward} · Supervisor ${asha.supervisor_name}`}
        actions={
          <>
            <Button variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}>
              <CloudUpload className="h-4 w-4" /> Sync {stats.pending_sync} offline record(s)
            </Button>
            <Button asChild>
              <Link href="/asha/visits">
                <CalendarDays className="h-4 w-4" /> Plan a visit
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Households" value={stats.households} hint={`${stats.assigned_patients} registered patients`} icon={Home} tone="primary" index={0} />
        <StatCard label="Visits today" value={`${stats.completed_today}/${stats.visits_today}`} hint={`${stats.target_completion_percent}% of daily target`} icon={CalendarDays} tone="success" index={1} />
        <StatCard label="Pregnancies tracked" value={stats.pregnancies_tracked} hint={`${stats.high_risk_cases} high risk`} icon={Baby} tone="warning" index={2} />
        <StatCard label="Immunisations due" value={stats.vaccinations_due} hint="Children in your ward" icon={Syringe} tone="info" index={3} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly field activity</CardTitle>
            <CardDescription>Planned versus completed household visits</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={data.weekly_trend}
              xKey="day"
              series={[
                { key: "planned", label: "Planned" },
                { key: "completed", label: "Completed" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily target</CardTitle>
            <CardDescription>{asha.daily_visit_target} household visits per day</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Progress value={stats.target_completion_percent} className="flex-1" />
              <span className="text-sm font-semibold">{stats.target_completion_percent}%</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-[var(--muted)] p-3">
                <p className="text-2xl font-bold">{stats.completed_today}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Completed</p>
              </div>
              <div className="rounded-xl bg-[var(--muted)] p-3">
                <p className="text-2xl font-bold">{Math.max(0, asha.daily_visit_target - stats.completed_today)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Remaining</p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/asha/targets">View all targets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s visits</CardTitle>
            <CardDescription>{formatDate(new Date())}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.today_visits.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No visits planned today"
                description="Plan household visits to meet your daily target."
                action={
                  <Button asChild size="sm">
                    <Link href="/asha/visits">Plan visits</Link>
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
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
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
              <AlertTriangle className="h-4 w-4 text-[var(--danger)]" /> High-risk pregnancies
            </CardTitle>
            <CardDescription>Escalate to the medical officer immediately</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.high_risk.length === 0 ? (
              <EmptyState icon={Users} title="No high-risk cases" description="All tracked pregnancies are within safe parameters." />
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
                    Week {record.gestation_weeks} · Hb {record.hemoglobin} g/dL · BP {record.bp_systolic}/{record.bp_diastolic} · ANC {record.anc_visits_completed}/4
                  </p>
                  {record.notes ? <p className="mt-1 text-xs text-[var(--danger)]">{record.notes}</p> : null}
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link href="/asha/pregnancies">Record ANC visit</Link>
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
