"use client";

import { useQuery } from "@tanstack/react-query";
import { Syringe } from "lucide-react";

import { SimpleBarChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface VaccinationDashboard {
  overall_coverage_percent: number;
  due_this_week: number;
  overdue: number;
  by_vaccine: { vaccine: string; total: number; completed: number; coverage_percent: number }[];
  children_by_locality: { locality: string; children: number }[];
}

export default function VaccinationDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "vaccination"],
    queryFn: () => api.get<VaccinationDashboard>("/api/v1/admin/vaccination-dashboard"),
  });

  if (isLoading || !data) return <LoadingBlock rows={5} />;

  return (
    <>
      <PageHeader title="Vaccination dashboard" description="Universal Immunisation Programme coverage across Pune district" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Overall coverage" value={`${data.overall_coverage_percent}%`} hint="All antigens" icon={Syringe} tone="success" index={0} />
        <StatCard label="Due this week" value={data.due_this_week} hint="Scheduled doses" icon={Syringe} tone="warning" index={1} />
        <StatCard label="Overdue" value={data.overdue} hint="Requires ASHA follow-up" icon={Syringe} tone="danger" index={2} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Coverage by vaccine</CardTitle>
            <CardDescription>Lowest coverage first — prioritise these antigens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.by_vaccine.map((row) => (
              <div key={row.vaccine}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{row.vaccine}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {row.completed}/{row.total} · {row.coverage_percent}%
                  </span>
                </div>
                <Progress className="mt-1.5" value={row.coverage_percent} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Children by locality</CardTitle>
            <CardDescription>Beneficiaries registered under the programme</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={data.children_by_locality} xKey="locality" series={[{ key: "children", label: "Children" }]} height={360} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
