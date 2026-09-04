"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart, Printer } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadTextFile, formatDate } from "@/lib/utils";

interface DistrictReport {
  role?: "hospital_admin" | "dho";
  scope?: "hospital" | "district";
  hospital_name?: string;
  title?: string;
  generated_on: string;
  district: string;
  sections: { title: string; metrics: { label: string; value: number }[] }[];
}

export default function DistrictReportsPage() {
  const { user } = useAuth();
  const isHospitalAdmin = user?.role === "hospital_admin";

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "report-summary", user?.role],
    queryFn: () => api.get<DistrictReport>("/api/v1/admin/reports/summary"),
  });

  if (isLoading || !data) return <LoadingBlock rows={5} />;

  function download() {
    if (!data) return;
    const headerTitle = isHospitalAdmin
      ? `SEVASETU AI — ${data.hospital_name?.toUpperCase() ?? "HOSPITAL"} OPERATIONS REPORT`
      : "SEVASETU AI — DISTRICT HEALTH REPORT";
    const issuedBy = isHospitalAdmin
      ? `Issued by Hospital Administration · ${data.hospital_name ?? "Hospital"}`
      : "Issued by the District Health Office · Pune District";

    const lines = [
      headerTitle,
      `Facility / District: ${data.hospital_name ?? data.district}`,
      `Generated on: ${data.generated_on}`,
      "",
      ...data.sections.flatMap((section) => [
        section.title.toUpperCase(),
        ...section.metrics.map((metric) => `  ${metric.label}: ${metric.value}`),
        "",
      ]),
      issuedBy,
    ];
    const filename = isHospitalAdmin
      ? `sevasetu-hospital-report-${data.generated_on}.txt`
      : `sevasetu-district-report-${data.generated_on}.txt`;
    downloadTextFile(filename, lines.join("\n"));
  }

  const pageTitle = isHospitalAdmin
    ? `${data.hospital_name ?? "Hospital"} · Operations Report`
    : "District Health Reports";
  const pageDesc = isHospitalAdmin
    ? `Monthly inpatient admissions, bed turnover, pharmacy supply, and OPD performance · generated ${formatDate(data.generated_on)}`
    : `Consolidated public health performance report across Pune District · generated ${formatDate(data.generated_on)}`;

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDesc}
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
              <CardDescription>
                {isHospitalAdmin ? data.hospital_name ?? "Hospital" : `${data.district} health administration`}
              </CardDescription>
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
