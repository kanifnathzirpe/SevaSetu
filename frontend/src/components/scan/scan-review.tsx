"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FamilyMemberSelector } from "./family-member-selector";
import { api } from "@/lib/api";
import type { DocumentScan } from "@/lib/types";

interface ScanReviewProps {
  scan: DocumentScan;
  onConfirm: (extractedData: Record<string, unknown>, notes: string) => void;
  onCancel: () => void;
}

export function ScanReview({ scan, onConfirm, onCancel }: ScanReviewProps) {
  const [extractedData, setExtractedData] = React.useState<Record<string, unknown>>({});
  const [selectedFamilyMember, setSelectedFamilyMember] = React.useState<number | null>(null);
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    try {
      const data = JSON.parse(scan.extracted_data || "{}");
      setExtractedData(data);
    } catch {
      setExtractedData({});
    }
  }, [scan.extracted_data]);

  const handleFieldChange = (field: string, value: string) => {
    setExtractedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Update child_id if family member selected
      if (selectedFamilyMember !== null) {
        await api.patch(`/api/v1/scan/${scan.id}`, {
          child_id: selectedFamilyMember,
          extracted_data: extractedData,
        });
      } else {
        await api.patch(`/api/v1/scan/${scan.id}`, {
          extracted_data: extractedData,
        });
      }

      // Confirm the scan
      await api.post(`/api/v1/scan/${scan.id}/confirm`, {
        extracted_data: extractedData,
        confirmed: true,
        notes,
      });

      onConfirm(extractedData, notes);
    } catch {
      toast.error("Failed to save document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFields = () => {
    switch (scan.document_type) {
      case "lab_report":
        return (
          <>
            <div className="space-y-2">
              <Label>Patient Name</Label>
              <Input
                value={String(extractedData.patient_name || "")}
                onChange={(e) => handleFieldChange("patient_name", e.target.value)}
                placeholder="Patient name"
              />
            </div>

            <div className="space-y-2">
              <Label>Report Date</Label>
              <Input
                type="date"
                value={String(extractedData.report_date || "")}
                onChange={(e) => handleFieldChange("report_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Laboratory</Label>
              <Input
                value={String(extractedData.laboratory || "")}
                onChange={(e) => handleFieldChange("laboratory", e.target.value)}
                placeholder="Laboratory name"
              />
            </div>

            <div className="space-y-2">
              <Label>Referring Doctor</Label>
              <Input
                value={String(extractedData.referring_doctor || "")}
                onChange={(e) => handleFieldChange("referring_doctor", e.target.value)}
                placeholder="Doctor name"
              />
            </div>

            {(extractedData.test_results as Record<string, unknown>) && (
              <div className="space-y-2">
                <Label>Test Results</Label>
                <div className="rounded-lg border p-3 bg-[var(--muted)]">
                  {Object.entries(extractedData.test_results as Record<string, unknown>).map(
                    ([test, result]) => (
                      <div key={test} className="flex justify-between py-1">
                        <span className="text-sm">{test}</span>
                        <span className="text-sm font-medium">
                          {typeof result === "object" ? JSON.stringify(result) : String(result || "")}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        );

      case "prescription":
        return (
          <>
            <div className="space-y-2">
              <Label>Patient Name</Label>
              <Input
                value={String(extractedData.patient_name || "")}
                onChange={(e) => handleFieldChange("patient_name", e.target.value)}
                placeholder="Patient name"
              />
            </div>

            <div className="space-y-2">
              <Label>Doctor Name</Label>
              <Input
                value={String(extractedData.doctor_name || "")}
                onChange={(e) => handleFieldChange("doctor_name", e.target.value)}
                placeholder="Doctor name"
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={String(extractedData.date || "")}
                onChange={(e) => handleFieldChange("date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Textarea
                value={String(extractedData.diagnosis || "")}
                onChange={(e) => handleFieldChange("diagnosis", e.target.value)}
                placeholder="Diagnosis"
                rows={2}
              />
            </div>

            {(extractedData.medicines as Array<Record<string, unknown>>)?.length > 0 && (
              <div className="space-y-2">
                <Label>Medicines</Label>
                <div className="space-y-2">
                  {(extractedData.medicines as Array<Record<string, unknown>>).map((med, idx) => (
                    <div key={idx} className="rounded-lg border p-3 bg-[var(--muted)]">
                      <p className="font-medium">{String(med.name || "Unknown")}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">{String(med.raw_line || "")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );

      case "referral":
        return (
          <>
            <div className="space-y-2">
              <Label>Patient Name</Label>
              <Input
                value={String(extractedData.patient_name || "")}
                onChange={(e) => handleFieldChange("patient_name", e.target.value)}
                placeholder="Patient name"
              />
            </div>

            <div className="space-y-2">
              <Label>Referring Doctor</Label>
              <Input
                value={String(extractedData.referring_doctor || "")}
                onChange={(e) => handleFieldChange("referring_doctor", e.target.value)}
                placeholder="Doctor name"
              />
            </div>

            <div className="space-y-2">
              <Label>Referring Facility</Label>
              <Input
                value={String(extractedData.referring_facility || "")}
                onChange={(e) => handleFieldChange("referring_facility", e.target.value)}
                placeholder="Facility name"
              />
            </div>

            <div className="space-y-2">
              <Label>Destination Facility</Label>
              <Input
                value={String(extractedData.destination_facility || "")}
                onChange={(e) => handleFieldChange("destination_facility", e.target.value)}
                placeholder="Destination facility"
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={String(extractedData.date || "")}
                onChange={(e) => handleFieldChange("date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Clinical Reason</Label>
              <Textarea
                value={String(extractedData.clinical_reason || "")}
                onChange={(e) => handleFieldChange("clinical_reason", e.target.value)}
                placeholder="Reason for referral"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Specialty</Label>
              <Input
                value={String(extractedData.specialty || "")}
                onChange={(e) => handleFieldChange("specialty", e.target.value)}
                placeholder="Medical specialty"
              />
            </div>
          </>
        );

      case "vaccination_record":
        return (
          <>
            <div className="space-y-2">
              <Label>Patient Name</Label>
              <Input
                value={String(extractedData.patient_name || "")}
                onChange={(e) => handleFieldChange("patient_name", e.target.value)}
                placeholder="Patient name"
              />
            </div>

            <div className="space-y-2">
              <Label>Vaccine</Label>
              <Input
                value={String(extractedData.vaccine || "")}
                onChange={(e) => handleFieldChange("vaccine", e.target.value)}
                placeholder="Vaccine name"
              />
            </div>

            <div className="space-y-2">
              <Label>Dose</Label>
              <Input
                value={String(extractedData.dose || "")}
                onChange={(e) => handleFieldChange("dose", e.target.value)}
                placeholder="Dose information"
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={String(extractedData.date || "")}
                onChange={(e) => handleFieldChange("date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Facility</Label>
              <Input
                value={String(extractedData.facility || "")}
                onChange={(e) => handleFieldChange("facility", e.target.value)}
                placeholder="Vaccination facility"
              />
            </div>

            <div className="space-y-2">
              <Label>Batch Number</Label>
              <Input
                value={String(extractedData.batch_number || "")}
                onChange={(e) => handleFieldChange("batch_number", e.target.value)}
                placeholder="Batch number"
              />
            </div>
          </>
        );

      default:
        return (
          <>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={String(extractedData.title || "")}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                placeholder="Document title"
              />
            </div>

            <div className="space-y-2">
              <Label>Patient Name</Label>
              <Input
                value={String(extractedData.patient_name || "")}
                onChange={(e) => handleFieldChange("patient_name", e.target.value)}
                placeholder="Patient name"
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={String(extractedData.date || "")}
                onChange={(e) => handleFieldChange("date", e.target.value)}
              />
            </div>
          </>
        );
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-0">
        {/* Fixed Header */}
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold mb-2">Review extracted information</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Please verify and edit the extracted information before saving
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(92vh - 200px)" }}>
          <div className="space-y-4">
            {scan.classification_confidence < 0.5 && (
              <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">Low confidence classification</p>
                  <p className="text-xs text-yellow-700">
                    The system could not confidently identify the document type. Please verify the
                    information carefully.
                  </p>
                </div>
              </div>
            )}

            <FamilyMemberSelector
              selectedId={selectedFamilyMember}
              onSelect={setSelectedFamilyMember}
              suggestedName={extractedData.patient_name as string}
            />

            <div className="space-y-4">{renderFields()}</div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={2}
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Medical safety notice</p>
                <p className="text-xs text-blue-700">
                  This feature extracts information from documents but does not provide medical
                  diagnosis or interpretation. Always consult a healthcare professional for medical
                  advice.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t border-[var(--border)] bg-[var(--card)]">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save to Records"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}