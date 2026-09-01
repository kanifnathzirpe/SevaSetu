"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart, Printer } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { downloadTextFile, formatDate } from "@/lib/utils";

interface DistrictReport {
  generated_on: string;
  district: string;
  sections: { title: string; metrics: { label: string; value: number }[] }[];
}

export default function DistrictReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "report-summary"],
    queryFn: () => api.get<DistrictReport>("/api/v1/admin/reports/summary"),
  });

  if (isLoading || !data) return <LoadingBlock rows={5} />;

  function download() {
    if (!data) return;
    const lines = [
      "SEVASETU AI — DISTRICT HEALTH REPORT",
      `District: ${data.district}`,
      `Generated on: ${data.generated_on}`,
      "",
      ...data.sections.flatMap((section) => [
        section.title.toUpperCase(),
        ...section.metrics.map((metric) => `  ${metric.label}: ${metric.value}`),
        "",
      ]),
      "Issued by the District Health Office, Pune — Government of Maharashtra",
    ];
    downloadTextFile(`sevasetu-district-report-${data.generated_on}.txt`, lines.join("\n"));
  }

  return (
    <>
      <PageHeader
        title="District reports"
        description={`Consolidated public health performance report · generated ${formatDate(data.generated_on)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button onClick={download}>
              <Download className="h-4 w-4" /> Download report
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {data.sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBarChart className="h-4 w-4 text-[var(--primary)]" /> {section.title}
              </CardTitle>
              <CardDescription>Pune district · {data.district} health administration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {section.metrics.map((metric) => (
                <div key={metric.label} className="flex items-center justify-between rounded-lg bg-[var(--muted)] px-3 py-2 text-sm">
                  <span>{metric.label}</span>
                  <span className="font-bold">{metric.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
