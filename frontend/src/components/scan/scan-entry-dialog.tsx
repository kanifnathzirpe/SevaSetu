"use client";

import { ScanLine } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogScrollableContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DocumentType } from "@/lib/types";

interface ScanEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanStart: (documentType: DocumentType) => void;
}

export function ScanEntryDialog({ open, onOpenChange, onScanStart }: ScanEntryDialogProps) {
  const [selectedType, setSelectedType] = React.useState<DocumentType>("other");

  const handleContinue = () => {
    onScanStart(selectedType);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogScrollableContent className="max-w-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-[var(--primary)]" />
            Scan medical document
          </DialogTitle>
          <DialogDescription className="mt-2">
            Select the type of document you want to scan
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSelectedType("other")}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-colors min-h-[88px] ${
                selectedType === "other"
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:bg-[var(--muted)]"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-white shrink-0">
                <ScanLine className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Scan & auto-detect</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Automatically identify document type
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("lab_report")}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-colors min-h-[88px] ${
                selectedType === "lab_report"
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:bg-[var(--muted)]"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white shrink-0">
                <span className="text-lg font-bold">📋</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Medical Report</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Lab reports, diagnostic tests, pathology
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("prescription")}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-colors min-h-[88px] ${
                selectedType === "prescription"
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:bg-[var(--muted)]"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500 text-white shrink-0">
                <span className="text-lg font-bold">💊</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Prescription</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Doctor prescriptions, medication lists
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("referral")}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-colors min-h-[88px] ${
                selectedType === "referral"
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:bg-[var(--muted)]"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shrink-0">
                <span className="text-lg font-bold">🏥</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Referral</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Doctor referrals, specialist consultations
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("vaccination_record")}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-colors min-h-[88px] ${
                selectedType === "vaccination_record"
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:bg-[var(--muted)]"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-500 text-white shrink-0">
                <span className="text-lg font-bold">💉</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Vaccination Record</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Immunization cards, vaccination certificates
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("other")}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-colors min-h-[88px] ${
                selectedType === "other"
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:bg-[var(--muted)]"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-500 text-white shrink-0">
                <span className="text-lg font-bold">📄</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Other Medical Document</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Any other medical document or record
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex gap-4 px-6 py-5 border-t border-[var(--border)]">
          <Button variant="outline" className="flex-1 h-12" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 h-12" onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </DialogScrollableContent>
    </Dialog>
  );
}