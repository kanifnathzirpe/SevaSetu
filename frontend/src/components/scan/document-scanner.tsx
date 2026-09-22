"use client";

import { Image as ImageIcon, Upload, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CameraCapture } from "./camera-capture";
import { api } from "@/lib/api";
import type { DocumentType } from "@/lib/types";

interface DocumentScannerProps {
  documentType: DocumentType;
  onScanComplete: (scanId: number) => void;
  onCancel: () => void;
}

export function DocumentScanner({ documentType, onScanComplete, onCancel }: DocumentScannerProps) {
  const [status, setStatus] = React.useState<"idle" | "camera" | "uploading" | "processing" | "complete" | "error">("idle");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Please select an image or PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setStatus("uploading");
    setProgress(10);
    setError(null);

    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);

      const response = await api.post<{ id: number }>("/api/v1/scan/upload", formData);

      if (response.id) {
        setProgress(50);
        setStatus("processing");

        // Process the scan
        await api.post(`/api/v1/scan/${response.id}/process`);

        setProgress(100);
        setStatus("complete");
        onScanComplete(response.id);
      }
    } catch (err) {
      setStatus("error");
      const errorMessage = err instanceof Error ? err.message : "Failed to process document";
      setError(errorMessage);
      console.error("Scan upload error:", err);
      toast.error(errorMessage);
    }
  };

  const handleCameraCapture = (file: File) => {
    handleFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleGallerySelect = () => {
    fileInputRef.current?.click();
  };

  const handleCameraSelect = () => {
    setStatus("camera");
  };

  const handleBack = () => {
    setStatus("idle");
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-6">
        {status === "camera" && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onCancel={handleBack}
          />
        )}

        {status === "idle" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Scan Document</h2>
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--muted)]">
                  <ImageIcon className="h-10 w-10 text-[var(--muted-foreground)]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Choose input method</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Capture with camera or select from gallery
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-32 flex-col gap-2"
                  onClick={handleCameraSelect}
                >
                  <ImageIcon className="h-8 w-8" />
                  <span>Camera</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-32 flex-col gap-2"
                  onClick={handleGallerySelect}
                >
                  <Upload className="h-8 w-8" />
                  <span>Gallery</span>
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </>
        )}

        {(status === "uploading" || status === "processing") && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Processing Document</h2>
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary)]/10">
                <ImageIcon className="h-10 w-10 text-[var(--primary)] animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {status === "uploading" ? "Uploading document..." : "Processing document..."}
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {status === "uploading"
                  ? "Please wait while we upload your document"
                  : "Extracting text and analyzing document structure"}
              </p>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="text-center text-sm text-[var(--muted-foreground)]">
              {progress}% complete
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Processing Failed</h2>
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <X className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Processing failed</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {error || "An error occurred while processing your document"}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => setStatus("idle")}>
                Try again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}