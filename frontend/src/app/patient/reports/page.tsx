"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Download, FileText, FlaskConical, ScanLine } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogScrollableContent,
} from "@/components/ui/dialog";
import { ScanEntryDialog } from "@/components/scan/scan-entry-dialog";
import { ScanWorkflow } from "@/components/scan/scan-workflow";
import { API_BASE_URL, api, tokenStore } from "@/lib/api";
import { getLocalTriageHistory } from "@/lib/triage";
import type { DocumentType, Report } from "@/lib/types";
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
  const [scanDialogOpen, setScanDialogOpen] = React.useState(false);
  const [scanWorkflowOpen, setScanWorkflowOpen] = React.useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = React.useState<DocumentType>("other");

  const { data = [], isLoading } = useQuery({
    queryKey: ["patient", "reports", type],
    queryFn: () => api.get<Report[]>(`/api/v1/patient/reports${type ? `?report_type=${type}` : ""}`),
  });

  const mergedReports = React.useMemo(() => {
    const local = getLocalTriageHistory();
    const localReports: Report[] = local.map((session, index) => ({
      id: -(index + 100),
      patient_id: session.patientId || 1,
      patient_name: session.patientName || "Patient",
      doctor_name: null,
      hospital_name: null,
      report_type: "triage",
      title: `Digital Triage Assessment — ${session.result.level}`,
      summary: session.result.explanation,
      result_json: JSON.stringify({
        "Triage Level": session.result.level,
        "Department": session.result.suggestedDepartment,
        "SpO2": `${session.input.vitals.spo2 ?? "N/A"}%`,
        "Temperature": `${session.input.vitals.temperature ?? "N/A"}°F`,
        "Blood Pressure": `${session.input.vitals.systolicBp ?? "N/A"}/${session.input.vitals.diastolicBp ?? "N/A"} mmHg`,
        "Pulse": `${session.input.vitals.pulse ?? "N/A"} bpm`,
      }),
      file_url: null,
      report_date: session.createdAt.slice(0, 10),
      is_abnormal: session.result.level !== "ROUTINE",
    }));

    const existingTitles = new Set(data.map((r) => r.title));
    const uniqueLocal = localReports.filter((r) => !existingTitles.has(r.title));
    const all = [...data, ...uniqueLocal];

    if (type) {
      return all.filter((r) => r.report_type.toLowerCase() === type.toLowerCase() || (type === "triage" && r.title.includes("Triage")));
    }
    return all;
  }, [data, type]);

  const types = Array.from(new Set(mergedReports.map((report) => report.report_type)));

  return (
    <>
      <PageHeader
        title="Lab & diagnostic reports"
        description="All investigations and digital clinical triage assessments"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setScanDialogOpen(true)}>
              <ScanLine className="h-4 w-4 mr-2" /> Scan document
            </Button>
            <Select value={type} onChange={(event) => setType(event.target.value)} className="w-48">
              <option value="">All report types</option>
              <option value="triage">Digital Triage</option>
              {["blood", "urine", "radiology", "pathology", "cardiology"].concat(types).filter((value, index, self) => self.indexOf(value) === index && value !== "triage").map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : mergedReports.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No reports found" description="Reports appear here once your investigations or triage sessions are recorded." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {mergedReports.map((report) => {
            let results: Record<string, string> = {};
            try {
              results = JSON.parse(report.result_json || "{}");
            } catch {
              results = {};
            }
            const isTriage = report.title.includes("Triage") || report.report_type === "triage";
            return (
              <Card key={report.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-semibold">
                        {isTriage ? (
                          <Activity className="h-4 w-4 text-[var(--primary)]" />
                        ) : (
                          <FileText className="h-4 w-4 text-[var(--primary)]" />
                        )}
                        {report.title}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {isTriage ? "Digital Triage Protocol" : titleCase(report.report_type)} · {formatDate(report.report_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isTriage && (
                        <Badge tone="primary" className="text-[10px]">
                          Triage
                        </Badge>
                      )}
                      <Badge tone={report.is_abnormal ? "danger" : "success"}>
                        {report.is_abnormal ? "Abnormal" : "Normal"}
                      </Badge>
                    </div>
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

      <ScanEntryDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        onScanStart={(documentType) => {
          setSelectedDocumentType(documentType);
          setScanWorkflowOpen(true);
        }}
      />

      <Dialog open={scanWorkflowOpen} onOpenChange={setScanWorkflowOpen}>
        <DialogScrollableContent className="max-w-4xl">
          <ScanWorkflow
            initialDocumentType={selectedDocumentType}
            onComplete={() => {
              setScanWorkflowOpen(false);
              setSelectedDocumentType("other");
            }}
          />
        </DialogScrollableContent>
      </Dialog>
    </>
  );
}
