"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, TrendingUp } from "lucide-react";
import * as React from "react";

import { SimpleBarChart } from "@/components/charts";
import { MapView, type MapMarker } from "@/components/map";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, formatDate, RISK_STYLES } from "@/lib/utils";

interface HeatmapPayload {
  points: {
    disease: string;
    locality: string;
    lat: number;
    lng: number;
    cases: number;
    severity: string;
    reported_on: string;
  }[];
  totals_by_disease: { disease: string; cases: number }[];
  totals_by_locality: { locality: string; cases: number }[];
  forecast: {
    locality: string;
    generated_on: string;
    forecasts: {
      disease: string;
      current_cases: number;
      projected_next_week: number;
      growth_percent: number;
      risk: string;
    }[];
  };
}

export default function DiseaseHeatmapPage() {
  const [days, setDays] = React.useState("30");
  const [disease, setDisease] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "heatmap", days],
    queryFn: () => api.get<HeatmapPayload>(`/api/v1/admin/disease-heatmap?days=${days}`),
  });

  if (isLoading || !data) return <LoadingBlock rows={5} />;

  const filtered = disease ? data.points.filter((point) => point.disease === disease) : data.points;

  const markers: MapMarker[] = filtered.map((point, index) => ({
    id: `${point.disease}-${index}`,
    lat: point.lat,
    lng: point.lng,
    title: `${point.disease} · ${point.locality}`,
    subtitle: `${point.cases} cases · ${point.severity} severity · reported ${formatDate(point.reported_on)}`,
    kind: "sos",
    radius: Math.min(40, 8 + point.cases * 1.5),
    color:
      point.severity === "critical"
        ? "#dc2626"
        : point.severity === "high"
          ? "#ea580c"
          : point.severity === "moderate"
            ? "#f59e0b"
            : "#0ea5e9",
  }));

  return (
    <>
      <PageHeader
        title="Disease heatmap"
        description="Geospatial surveillance of notifiable diseases with AI outbreak forecasting"
        actions={
          <div className="flex gap-3">
            <Select value={disease} onChange={(event) => setDisease(event.target.value)} className="w-48">
              <option value="">All diseases</option>
              {data.totals_by_disease.map((row) => (
                <option key={row.disease} value={row.disease}>
                  {row.disease}
                </option>
              ))}
            </Select>
            <Select value={days} onChange={(event) => setDays(event.target.value)} className="w-40">
              {["7", "30", "60", "90"].map((value) => (
                <option key={value} value={value}>
                  Last {value} days
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <MapView markers={markers} heat className="h-[420px] w-full" />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--primary)]" /> AI outbreak forecast
            </CardTitle>
            <CardDescription>
              {data.forecast.locality} · four-week case velocity · generated {formatDate(data.forecast.generated_on)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.forecast.forecasts.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">Not enough surveillance data for a forecast.</p>
            ) : (
              data.forecast.forecasts.map((item) => {
                const trend = item.growth_percent > 5 ? "rising" : item.growth_percent < -5 ? "falling" : "stable";
                return (
                  <div key={item.disease} className="rounded-xl border border-[var(--border)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{item.disease}</p>
                      <div className="flex items-center gap-2">
                        <Badge tone={trend === "rising" ? "danger" : trend === "falling" ? "success" : "default"}>
                          {trend} {item.growth_percent > 0 ? "+" : ""}
                          {item.growth_percent}%
                        </Badge>
                        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold capitalize", RISK_STYLES[item.risk])}>
                          {item.risk}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm">
                      {item.current_cases} cases reported in the last 7 days across {data.forecast.locality}.
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Projected next week: {item.projected_next_week} cases
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> Cases by disease
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.totals_by_disease.map((row) => (
              <div key={row.disease} className="flex items-center justify-between rounded-lg bg-[var(--muted)] px-3 py-2 text-sm">
                <span>{row.disease}</span>
                <span className="font-semibold">{row.cases}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--primary)]" /> Cases by locality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleBarChart data={data.totals_by_locality.slice(0, 14)} xKey="locality" series={[{ key: "cases", label: "Cases" }]} height={320} />
        </CardContent>
      </Card>
    </>
  );
}
