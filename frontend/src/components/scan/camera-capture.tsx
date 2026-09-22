"use client";

import { Camera, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);

  // Use refs for mutable values that don't trigger re-renders
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const isMountedRef = React.useRef(true);

  // Cleanup function - doesn't depend on state
  const stopCamera = React.useCallback(() => {
    console.log("[Camera] stopCamera called");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log("[Camera] Stopping track:", track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  // Single unified effect for camera lifecycle
  React.useEffect(() => {
    console.log("[Camera] Component mounted");
    isMountedRef.current = true;

    const startCamera = async () => {
      console.log("[Camera] Starting camera initialization");
      try {
        // Check if camera is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error("[Camera] getUserMedia not supported");
          if (isMountedRef.current) {
            setError("Camera is not supported in this browser");
          }
          return;
        }

        // Request camera access with fallback constraints
        let mediaStream: MediaStream;
        try {
          console.log("[Camera] Requesting camera with environment mode");
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
        } catch (err) {
          if (err instanceof Error && err.name === "OverconstrainedError") {
            console.log("[Camera] Overconstrained, retrying with basic constraints");
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          } else {
            throw err;
          }
        }

        // Check if component is still mounted
        if (!isMountedRef.current) {
          console.log("[Camera] Component unmounted during camera request, stopping stream");
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        console.log("[Camera] Stream obtained, tracks:", mediaStream.getTracks().length);
        streamRef.current = mediaStream;

        // Wait for video element to be available
        const video = videoRef.current;
        if (!video) {
          console.error("[Camera] Video element not available");
          if (isMountedRef.current) {
            setError("Camera initialization failed");
          }
          stopCamera();
          return;
        }

        // Attach stream to video
        console.log("[Camera] Attaching stream to video element");
        video.srcObject = mediaStream;

        // Wait for video to be ready before playing
        video.onloadedmetadata = () => {
          console.log("[Camera] Video metadata loaded, dimensions:", video.videoWidth, "x", video.videoHeight);
          if (!isMountedRef.current) {
            console.log("[Camera] Component unmounted during video load");
            stopCamera();
            return;
          }

          setIsReady(true);

          // Play the video
          video.play()
            .then(() => {
              console.log("[Camera] Video playing successfully");
            })
            .catch((playErr) => {
              console.error("[Camera] Video play error:", playErr);
              // AbortError is usually a lifecycle issue, not a real camera failure
              if (playErr instanceof Error && playErr.name === "AbortError") {
                console.log("[Camera] AbortError - likely lifecycle issue, not showing to user");
                // Don't set error for AbortError - it's transient
              } else if (isMountedRef.current) {
                setError("Failed to start camera preview");
              }
            });
        };

        video.onerror = () => {
          console.error("[Camera] Video element error");
          if (isMountedRef.current) {
            setError("Camera preview failed to load");
          }
          stopCamera();
        };

      } catch (err) {
        console.error("[Camera] Camera initialization error:", err);
        if (!isMountedRef.current) return;

        if (err instanceof Error) {
          switch (err.name) {
            case "NotAllowedError":
              setError("Camera permission was denied. Please use file upload instead.");
              break;
            case "NotFoundError":
              setError("No camera was found. Please use file upload instead.");
              break;
            case "NotReadableError":
              setError("Camera is already being used by another application.");
              break;
            case "SecurityError":
              setError("Camera access requires a secure context (HTTPS or localhost).");
              break;
            default:
              setError("Camera unavailable. Please use file upload instead.");
          }
        } else {
          setError("Camera unavailable. Please use file upload instead.");
        }
      }
    };

    startCamera();

    // Cleanup on unmount
    return () => {
      console.log("[Camera] Component unmounting, cleaning up");
      isMountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      console.error("[Camera] Capture failed - missing refs");
      toast.error("Camera not ready");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Verify video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("[Camera] Video dimensions invalid:", video.videoWidth, video.videoHeight);
      toast.error("Camera is still starting. Please wait.");
      return;
    }

    console.log("[Camera] Capturing image, dimensions:", video.videoWidth, "x", video.videoHeight);
    setIsCapturing(true);

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("[Camera] Canvas toBlob failed");
          toast.error("Failed to capture image");
          setIsCapturing(false);
          return;
        }

        console.log("[Camera] Image captured, size:", blob.size, "bytes");
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        stopCamera();
        onCapture(file);
      }, "image/jpeg", 0.9);
    } catch (err) {
      console.error("[Camera] Capture error:", err);
      toast.error("Failed to capture image");
      setIsCapturing(false);
    }
  };

  const handleCancel = () => {
    console.log("[Camera] Cancel requested");
    stopCamera();
    onCancel();
  };

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Camera Error</h2>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center py-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <X className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Camera unavailable</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              {error}
            </p>
            <Button onClick={handleCancel}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Capture Document</h2>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Camera preview - video element always mounted */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Loading overlay */}
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--primary)] border-t-transparent mx-auto mb-4" />
                  <p className="text-sm text-white">Starting camera...</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-[var(--muted-foreground)] text-center">
            Position the document within the frame
          </p>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCapture}
              disabled={!isReady || isCapturing}
            >
              {isCapturing ? "Capturing..." : <><Camera className="h-4 w-4 mr-2" /> Capture</>}
            </Button>
          </div>
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}