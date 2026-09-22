"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { DocumentScanner } from "./document-scanner";
import { ScanReview } from "./scan-review";
import { ScanSuccess } from "./scan-success";
import type { DocumentScan, DocumentType } from "@/lib/types";
import { api } from "@/lib/api";

type WorkflowStep = "scanning" | "review" | "success";

interface ScanWorkflowProps {
  onComplete: () => void;
  initialDocumentType?: DocumentType;
}

export function ScanWorkflow({ onComplete, initialDocumentType }: ScanWorkflowProps) {
  const [step, setStep] = React.useState<WorkflowStep>("scanning");
  const [scanId, setScanId] = React.useState<number | null>(null);
  const [completedScan, setCompletedScan] = React.useState<DocumentScan | null>(null);

  const { data: scan } = useQuery({
    queryKey: ["scan", scanId],
    queryFn: () => api.get<DocumentScan>(`/api/v1/scan/${scanId}`),
    enabled: scanId !== null,
  });

  React.useEffect(() => {
    if (scan && scan.processing_status === "extracted" && step === "scanning") {
      setStep("review");
    }
  }, [scan, step, scanId]);

  const handleScanComplete = (id: number) => {
    setScanId(id);
  };

  const handleReviewConfirm = async (extractedData: Record<string, unknown>, notes: string) => {
    try {
      if (scanId) {
        await api.post(`/api/v1/scan/${scanId}/confirm`, {
          extracted_data: extractedData,
          confirmed: true,
          notes,
        });

        // Fetch the updated scan
        const updatedScan = await api.get<DocumentScan>(`/api/v1/scan/${scanId}`);
        setCompletedScan(updatedScan);
        setStep("success");
        toast.success("Document saved successfully");
      }
    } catch {
      toast.error("Failed to save document. Please try again.");
    }
  };

  const handleViewRecord = () => {
    onComplete();
  };

  const handleDone = () => {
    onComplete();
  };

  const handleCancel = () => {
    onComplete();
  };

  if (step === "scanning") {
    return (
      <DocumentScanner
        documentType={initialDocumentType || "other"}
        onScanComplete={handleScanComplete}
        onCancel={handleCancel}
      />
    );
  }

  if (step === "review" && scan) {
    return (
      <ScanReview
        scan={scan}
        onConfirm={handleReviewConfirm}
        onCancel={handleCancel}
      />
    );
  }

  if (step === "success" && completedScan) {
    return (
      <ScanSuccess
        scan={completedScan}
        onViewRecord={handleViewRecord}
        onDone={handleDone}
      />
    );
  }

  // Default: should not happen if called correctly
  return null;
}