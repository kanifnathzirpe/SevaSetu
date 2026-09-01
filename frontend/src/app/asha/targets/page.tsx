"use client";

import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";

import { SimpleBarChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { AshaDashboard } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface Targets {
  date: string;
  targets: { label: string; done: number; target: number }[];
  completion_percent: number;
}

export default function AshaTargetsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["asha", "targets"],
    queryFn: () => api.get<Targets>("/api/v1/asha/targets"),
  });

  const { data: dashboard } = useQuery({
    queryKey: ["asha", "dashboard"],
    queryFn: () => api.get<AshaDashboard>("/api/v1/asha/dashboard"),
  });

  if (isLoading || !data) return <LoadingBlock rows={4} />;

  return (
    <>
      <PageHeader title="Daily targets" description={`Performance against sub-centre targets for ${formatDate(data.date)}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[var(--primary)]" /> Today&apos;s targets
            </CardTitle>
            <CardDescription>Overall completion {data.completion_percent}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {data.targets.map((target) => {
              const percent = target.target ? Math.min(100, Math.round((target.done / target.target) * 100)) : 0;
              return (
                <div key={target.label}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{target.label}</span>
                    <span className="text-[var(--muted-foreground)]">
                      {target.done} / {target.target}
                    </span>
                  </div>
                  <Progress className="mt-2" value={percent} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly performance</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={dashboard?.weekly_trend ?? []}
              xKey="day"
              series={[
                { key: "planned", label: "Planned" },
                { key: "completed", label: "Completed" },
              ]}
              height={240}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
