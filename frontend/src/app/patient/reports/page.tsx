"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileText, FlaskConical } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { API_BASE_URL, api, tokenStore } from "@/lib/api";
import type { Report } from "@/lib/types";
import { downloadTextFile, formatDate, titleCase } from "@/lib/utils";

async function downloadReport(report: Report) {
  const response = await fetch(`${API_BASE_URL}/api/v1/reports/${report.id}/download`, {
    headers: { Authorization: `Bearer ${tokenStore.access ?? ""}` },
  });
  if (!response.ok) {
    toast.error("Unable to download report");
    return;
  }
  const text = await response.text();
  downloadTextFile(`${report.title.replace(/\s+/g, "-").toLowerCase()}-${report.id}.txt`, text);
  toast.success("Report downloaded");
}

export default function PatientReportsPage() {
  const [type, setType] = React.useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["patient", "reports", type],
    queryFn: () => api.get<Report[]>(`/api/v1/patient/reports${type ? `?report_type=${type}` : ""}`),
  });

  const types = Array.from(new Set(data.map((report) => report.report_type)));

  return (
    <>
      <PageHeader
        title="Lab & diagnostic reports"
        description="All investigations conducted at government laboratories"
        actions={
          <Select value={type} onChange={(event) => setType(event.target.value)} className="w-48">
            <option value="">All report types</option>
            {["blood", "urine", "radiology", "pathology", "cardiology"].concat(types).filter((value, index, self) => self.indexOf(value) === index).map((item) => (
              <option key={item} value={item}>
                {titleCase(item)}
              </option>
            ))}
          </Select>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No reports found" description="Reports appear here once your lab tests are processed." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((report) => {
            let results: Record<string, string> = {};
            try {
              results = JSON.parse(report.result_json || "{}");
            } catch {
              results = {};
            }
            return (
              <Card key={report.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-semibold">
                        <FileText className="h-4 w-4 text-[var(--primary)]" /> {report.title}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {titleCase(report.report_type)} · {formatDate(report.report_date)}
                      </p>
                    </div>
                    <Badge tone={report.is_abnormal ? "danger" : "success"}>
                      {report.is_abnormal ? "Abnormal" : "Normal"}
                    </Badge>
                  </div>

                  <p className="mt-3 text-sm">{report.summary}</p>

                  {Object.keys(results).length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(results).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-[var(--muted)] px-3 py-2">
                          <p className="text-[var(--muted-foreground)]">{key}</p>
                          <p className="font-semibold text-[var(--foreground)]">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {report.doctor_name ? `Ordered by ${report.doctor_name}` : "Government laboratory"}
                      {report.hospital_name ? ` · ${report.hospital_name}` : ""}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => downloadReport(report)}>
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
