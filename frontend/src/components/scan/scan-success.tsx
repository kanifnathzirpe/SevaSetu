"use client";

import { CheckCircle2, FileText, FlaskConical, Pill, Syringe } from "lucide-react";
import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DocumentScan } from "@/lib/types";

interface ScanSuccessProps {
  scan: DocumentScan;
  onViewRecord: () => void;
  onDone: () => void;
}

export function ScanSuccess({ scan, onViewRecord, onDone }: ScanSuccessProps) {
  const router = useRouter();

  const getIcon = () => {
    switch (scan.document_type) {
      case "lab_report":
        return <FlaskConical className="h-8 w-8" />;
      case "prescription":
        return <Pill className="h-8 w-8" />;
      case "referral":
        return <FileText className="h-8 w-8" />;
      case "vaccination_record":
        return <Syringe className="h-8 w-8" />;
      default:
        return <FileText className="h-8 w-8" />;
    }
  };

  const getDocumentTypeLabel = () => {
    switch (scan.document_type) {
      case "lab_report":
        return "Lab Report";
      case "prescription":
        return "Prescription";
      case "referral":
        return "Referral";
      case "vaccination_record":
        return "Vaccination Record";
      default:
        return "Medical Document";
    }
  };

  const getRecordRoute = () => {
    switch (scan.document_type) {
      case "lab_report":
      case "other":
        return "/patient/reports";
      case "prescription":
        return "/patient/prescriptions";
      case "referral":
        return "/patient/referrals";
      case "vaccination_record":
        return "/patient/vaccinations";
      default:
        return "/patient/reports";
    }
  };

  const handleViewRecord = () => {
    router.push(getRecordRoute());
    onViewRecord();
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Document saved successfully</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Your document has been processed and saved to your records
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4 rounded-lg border p-4 bg-[var(--muted)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white">
              {getIcon()}
            </div>
            <div className="flex-1">
              <p className="font-medium">{getDocumentTypeLabel()}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {scan.child_name ? scan.child_name : scan.patient_name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[var(--muted-foreground)]">Document type</p>
              <p className="font-medium">{getDocumentTypeLabel()}</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)]">Date scanned</p>
              <p className="font-medium">
                {new Date(scan.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleViewRecord}>
            View record
          </Button>
          <Button className="flex-1" onClick={onDone}>
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}