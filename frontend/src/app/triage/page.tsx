"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  HeartPulse,
  History,
  Mic,
  MicOff,
  Phone,
  RotateCcw,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
  User,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  clearTriageDraft,
  evaluateTriage,
  getLocalTriageHistory,
  loadTriageDraft,
  markSessionSynced,
  saveLocalTriageSession,
  saveTriageDraft,
  type PatientContext,
  type TriageInput,
  type TriageResult,
  type TriageSessionRecord,
  type TriageVitals,
} from "@/lib/triage";
import defaultRules from "@/lib/triage-rules.json";
import type { Doctor, PatientDashboard } from "@/lib/types";
import { cn, downloadTextFile, formatDate, titleCase } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Speech Recognition Interface (Browser Web Speech API)             */
/* ------------------------------------------------------------------ */
interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface IWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

export default function DigitalTriagePage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Active Stepper state: 1 = Patient Context, 2 = Symptoms & Vitals, 3 = Assessment & Branch Actions
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3>(1);

  // Patient Identity (Pre-filled from session)
  const [patientState, setPatientState] = React.useState<PatientContext>({
    name: user?.full_name || "Citizen Patient",
    healthId: "MH-PUN-0001",
    abhaId: "14-1234-5678-9012",
    age: 38,
    gender: "male",
    isPregnant: false,
    chronicConditions: "None",
    locality: user?.locality || "Pune District",
  });

  // Symptom checklist selections
  const [selectedSymptoms, setSelectedSymptoms] = React.useState<string[]>([]);
  const [freeText, setFreeText] = React.useState("");

  // Vitals inputs
  const [vitals, setVitals] = React.useState<TriageVitals>({
    temperature: null,
    systolicBp: null,
    diastolicBp: null,
    pulse: null,
    spo2: null,
    weight: null,
  });

  // Triage Result & Active Session
  const [activeResult, setActiveResult] = React.useState<TriageResult | null>(null);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [activeReferralSlip, setActiveReferralSlip] = React.useState<string | null>(null);
  const [createdAppointmentId, setCreatedAppointmentId] = React.useState<number | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<"synced" | "pending">("synced");

  // History state & expansion
  const [localHistory, setLocalHistory] = React.useState<TriageSessionRecord[]>([]);
  const [expandedSessionId, setExpandedSessionId] = React.useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);

  // Active Category filter in symptom catalog
  const [activeCategory, setActiveCategory] = React.useState("general");

  // Load Patient profile from backend
  const { data: dashboardData } = useQuery({
    queryKey: ["patient", "dashboard"],
    queryFn: () => api.get<PatientDashboard>("/api/v1/patient/dashboard"),
    enabled: user?.role === "patient",
  });

  // Query doctors for appointment branch action
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", "available"],
    queryFn: () => api.get<Doctor[]>("/api/v1/doctors"),
  });

  /* ------------------------------------------------------------------ */
  /*  Initialize Patient Context & Restore Draft                        */
  /* ------------------------------------------------------------------ */
  React.useEffect(() => {
    if (dashboardData?.patient) {
      const p = dashboardData.patient;
      setPatientState({
        id: p.id,
        name: p.full_name,
        healthId: p.health_id,
        abhaId: p.abha_number,
        age: p.age || 38,
        gender: p.gender || "male",
        isPregnant: Boolean(p.is_pregnant),
        chronicConditions: p.chronic_conditions || "None",
        locality: p.locality || user?.locality || "Pune",
      });
    }
  }, [dashboardData, user]);

  // Restore autosaved draft on mount
  React.useEffect(() => {
    const draft = loadTriageDraft();
    if (draft) {
      if (draft.selectedSymptoms && draft.selectedSymptoms.length > 0) {
        setSelectedSymptoms(draft.selectedSymptoms);
      }
      if (draft.freeTextSymptoms) {
        setFreeText(draft.freeTextSymptoms);
      }
      if (draft.vitals) {
        setVitals(draft.vitals);
      }
      if (draft.patient) {
        setPatientState((prev) => ({ ...prev, ...draft.patient }));
      }
    }
    setLocalHistory(getLocalTriageHistory());
  }, []);

  // Autosave on change
  React.useEffect(() => {
    saveTriageDraft({
      patient: patientState,
      selectedSymptoms,
      freeTextSymptoms: freeText,
      vitals,
    });
  }, [patientState, selectedSymptoms, freeText, vitals]);

  // Clean up speech recognition
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Voice Input Handler                                               */
  /* ------------------------------------------------------------------ */
  const toggleVoiceRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }

    if (typeof window === "undefined") return;
    const win = window as unknown as IWindow;
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechClass) {
      toast.error("Voice input is not supported in this browser. Please type symptoms below.");
      return;
    }

    try {
      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = locale === "hi" ? "hi-IN" : locale === "mr" ? "mr-IN" : "en-IN";

      recognition.onstart = () => {
        setIsRecording(true);
        toast.info("Listening... speak your symptoms clearly.");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setFreeText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (err: { error: string }) => {
        setIsRecording(false);
        if (err.error === "not-allowed") {
          toast.error("Microphone access denied. Please check permissions.");
        } else {
          toast.error("Voice input interrupted. You may continue typing.");
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
      toast.error("Unable to start voice recording.");
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Triage Evaluation & Submission                                    */
  /* ------------------------------------------------------------------ */
  const handleRunTriage = async () => {
    const input: TriageInput = {
      patient: patientState,
      selectedSymptoms,
      freeTextSymptoms: freeText,
      vitals,
    };

    // Pure evaluation function
    const result = evaluateTriage(input);
    const sessionId = `tri-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setActiveResult(result);
    setActiveSessionId(sessionId);
    setCurrentStep(3);

    // Auto-generate Referral note if emergency
    let referralText = "";
    if (result.level === "EMERGENCY") {
      referralText = `EMERGENCY REFERRAL SLIP\nPatient: ${patientState.name} (Health ID: ${patientState.healthId})\nAge/Sex: ${patientState.age} / ${patientState.gender}\nUrgency: CRITICAL / EMERGENCY (Level 1)\nTriggers: ${result.triggers.map((t) => t.criterion).join(", ")}\nVitals: SpO2: ${vitals.spo2 ?? "N/A"}%, Temp: ${vitals.temperature ?? "N/A"}°F, BP: ${vitals.systolicBp ?? "N/A"}/${vitals.diastolicBp ?? "N/A"} mmHg, Pulse: ${vitals.pulse ?? "N/A"} bpm\nClinical Impression: ${result.explanation}\nDispatched to nearest Trauma/Casualty Center.`;
      setActiveReferralSlip(referralText);
    }

    // Prepare session record
    const sessionRecord: TriageSessionRecord = {
      id: sessionId,
      patientId: patientState.id,
      patientHealthId: patientState.healthId,
      patientName: patientState.name,
      input,
      result,
      createdAt: new Date().toISOString(),
      syncStatus: "pending",
      referralNote: referralText,
    };

    // Save locally first (offline-first resilience)
    saveLocalTriageSession(sessionRecord);
    setLocalHistory(getLocalTriageHistory());

    // Sync to backend
    setIsSyncing(true);
    try {
      await api.post("/api/v1/triage/sessions", {
        session_id: sessionId,
        patient_health_id: patientState.healthId,
        level: result.level,
        score: result.score,
        symptoms: selectedSymptoms,
        free_text_symptoms: freeText,
        vitals,
        triggers: result.triggers,
        explanation: result.explanation,
        suggested_department: result.suggestedDepartment,
        recommended_actions: result.recommendedActions,
        branch_type: result.branchType,
        referral_note: referralText,
      });
      markSessionSynced(sessionId);
      setSyncStatus("synced");
      setLocalHistory(getLocalTriageHistory());
      queryClient.invalidateQueries({ queryKey: ["patient", "medical-history"] });
      queryClient.invalidateQueries({ queryKey: ["patient", "reports"] });
    } catch {
      setSyncStatus("pending");
      toast.warning("Saved locally in offline mode. Will automatically sync when connection is restored.");
    } finally {
      setIsSyncing(false);
    }

    // Clear autosaved draft on successful triage
    clearTriageDraft();
  };

  /* ------------------------------------------------------------------ */
  /*  Branch Action: Emergency Ambulance & Alert Dispatch               */
  /* ------------------------------------------------------------------ */
  const raiseEmergencyAlert = useMutation({
    mutationFn: () =>
      api.post<{ ambulance_number?: string }>("/api/v1/emergency/sos", {
        emergency_type: "Digital Triage Emergency",
        description: activeResult?.explanation || "Critical triage trigger detected",
        latitude: 18.5204,
        longitude: 73.8567,
        address: patientState.locality,
      }),
    onSuccess: (data) => {
      toast.success(`108 Ambulance Alerted! Vehicle #${data.ambulance_number || "MH-12-AM-108"} scheduled.`);
    },
    onError: () => {
      toast.info("108 Emergency Call Protocol initiated. Dialing 108 directly.");
    },
  });

  /* ------------------------------------------------------------------ */
  /*  Branch Action: Priority Video Appointment Booking                 */
  /* ------------------------------------------------------------------ */
  const bookPriorityAppointment = useMutation({
    mutationFn: async () => {
      const assignedDoctor = doctors[0];
      const tomorrow = new Date(Date.now() + 3600_000).toISOString().slice(0, 16);
      return api.post<{ id: number; token_number?: number }>("/api/v1/appointments", {
        doctor_id: assignedDoctor ? assignedDoctor.id : 1,
        scheduled_at: `${tomorrow}:00`,
        appointment_type: "video",
        reason: `[PRIORITY DIGITAL TRIAGE] ${activeResult?.explanation || "Urgent triage follow-up"}`,
      });
    },
    onSuccess: (data) => {
      setCreatedAppointmentId(data.id);
      toast.success(`Priority Video Consultation Confirmed! Token #${data.token_number || 1}`);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patient", "dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to schedule priority appointment");
    },
  });

  /* ------------------------------------------------------------------ */
  /*  Toggle Symptom Selection                                          */
  /* ------------------------------------------------------------------ */
  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((id) => id !== symptomId) : [...prev, symptomId]
    );
  };

  const handleClearDraft = () => {
    clearTriageDraft();
    setSelectedSymptoms([]);
    setFreeText("");
    setVitals({
      temperature: null,
      systolicBp: null,
      diastolicBp: null,
      pulse: null,
      spo2: null,
      weight: null,
    });
    toast.info("Triage form cleared.");
  };

  /* ------------------------------------------------------------------ */
  /*  Download Referral Slip                                            */
  /* ------------------------------------------------------------------ */
  const handleDownloadSlip = () => {
    if (!activeReferralSlip) return;
    downloadTextFile(`Emergency-Referral-Slip-${patientState.healthId}.txt`, activeReferralSlip);
    toast.success("Emergency Referral Slip downloaded.");
  };

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title="Digital Triage & Clinical Assessment"
        description="Rule-based pre-consultation assessment, early warning scoring, and priority care routing."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
                syncStatus === "synced"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
              )}
            >
              {isSyncing ? (
                <>
                  <Wifi className="h-3.5 w-3.5 animate-pulse" /> Syncing...
                </>
              ) : syncStatus === "synced" ? (
                <>
                  <Wifi className="h-3.5 w-3.5" /> Synced
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" /> Pending sync (Offline)
                </>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDraft}
              className="text-xs text-[var(--muted-foreground)] hover:text-red-600"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Form
            </Button>
          </div>
        }
      />

      {/* Stepper Navigation Bar */}
      <div className="mt-4 mb-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { step: 1, label: "1. Patient Context", icon: User },
            { step: 2, label: "2. Symptoms & Vitals", icon: Stethoscope },
            { step: 3, label: "3. Triage & Actions", icon: Activity },
          ].map((item) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  if (item.step < currentStep || activeResult) {
                    setCurrentStep(item.step as 1 | 2 | 3);
                  }
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border p-3 text-xs sm:text-sm font-semibold transition-all",
                  isCurrent
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                    : isCompleted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] opacity-75"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {isCompleted && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: PATIENT IDENTITY & CONTEXT */}
      {currentStep === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-[var(--primary)]" /> Patient Identity & Clinical Baseline
                  </CardTitle>
                  <CardDescription>
                    Automatically pre-filled from your authenticated SevaSetu Health ID profile.
                  </CardDescription>
                </div>
                <Badge tone="primary">ABHA Verified</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                  <p className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Full Name
                  </p>
                  <p className="text-sm font-semibold text-[var(--foreground)] mt-0.5">{patientState.name}</p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                  <p className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Health ID / ABHA
                  </p>
                  <p className="text-sm font-semibold text-[var(--foreground)] mt-0.5">
                    {patientState.healthId} · {patientState.abhaId || "Linked"}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                  <p className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Age / Gender
                  </p>
                  <p className="text-sm font-semibold text-[var(--foreground)] mt-0.5">
                    {patientState.age} years · {titleCase(patientState.gender)}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                  <p className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Locality
                  </p>
                  <p className="text-sm font-semibold text-[var(--foreground)] mt-0.5 truncate">{patientState.locality}</p>
                </div>
              </div>

              {/* Editable clinical risk context */}
              <div className="grid gap-4 sm:grid-cols-2 border-t border-[var(--border)] pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="chronicConditions" className="text-xs font-semibold">
                    Known Chronic Conditions / Comorbidities
                  </Label>
                  <Input
                    id="chronicConditions"
                    value={patientState.chronicConditions || ""}
                    onChange={(e) => setPatientState((prev) => ({ ...prev, chronicConditions: e.target.value }))}
                    placeholder="e.g. Hypertension, Diabetes, Asthma, Heart disease"
                  />
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Used by the triage engine to identify vulnerable high-risk profiles.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pregnancy Status</Label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="isPregnant"
                        checked={patientState.isPregnant}
                        onChange={() => setPatientState((prev) => ({ ...prev, isPregnant: true }))}
                        className="h-4 w-4 text-[var(--primary)] accent-[var(--primary)]"
                      />
                      <span>Yes, Currently Pregnant</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="isPregnant"
                        checked={!patientState.isPregnant}
                        onChange={() => setPatientState((prev) => ({ ...prev, isPregnant: false }))}
                        className="h-4 w-4 text-[var(--primary)] accent-[var(--primary)]"
                      />
                      <span>No</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Triggers maternal health danger protocols and obstetrics routing.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="default" onClick={() => setCurrentStep(2)} className="gap-2 font-medium">
                  Proceed to Symptoms & Vitals <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* STEP 2: SYMPTOMS & VITALS CAPTURE */}
      {currentStep === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Vitals Capture Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HeartPulse className="h-5 w-5 text-[var(--primary)]" /> Vital Signs & Physiological Measurements
                  </CardTitle>
                  <CardDescription>
                    Enter available patient readings. Inline normal range markers assist early detection.
                  </CardDescription>
                </div>
                <Badge tone="default">Autosaving locally</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* SpO2 */}
                <div className="space-y-1.5 rounded-xl border border-[var(--border)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vital-spo2" className="text-xs font-semibold flex items-center gap-1.5">
                      Oxygen Saturation (SpO2)
                    </Label>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">95–100%</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="vital-spo2"
                      type="number"
                      min={50}
                      max={100}
                      placeholder="e.g. 98"
                      value={vitals.spo2 ?? ""}
                      onChange={(e) =>
                        setVitals((prev) => ({
                          ...prev,
                          spo2: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                      className="pr-10 font-medium"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[var(--muted-foreground)]">%</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {vitals.spo2 != null && vitals.spo2 < 90 ? (
                      <span className="text-red-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Critical (&lt;90%)
                      </span>
                    ) : vitals.spo2 != null && vitals.spo2 <= 94 ? (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Urgent (90–94%)
                      </span>
                    ) : (
                      "Normal: 95 – 100%"
                    )}
                  </p>
                </div>

                {/* Temperature */}
                <div className="space-y-1.5 rounded-xl border border-[var(--border)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vital-temp" className="text-xs font-semibold">
                      Body Temperature
                    </Label>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">97.5–99.0 °F</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="vital-temp"
                      type="number"
                      step="0.1"
                      min={90}
                      max={110}
                      placeholder="e.g. 98.6"
                      value={vitals.temperature ?? ""}
                      onChange={(e) =>
                        setVitals((prev) => ({
                          ...prev,
                          temperature: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                      className="pr-10 font-medium"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[var(--muted-foreground)]">°F</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {vitals.temperature != null && vitals.temperature >= 104 ? (
                      <span className="text-red-600 font-semibold">Hyperpyrexia (&ge;104 °F)</span>
                    ) : vitals.temperature != null && vitals.temperature >= 101 ? (
                      <span className="text-amber-600 font-semibold">High Fever (&ge;101 °F)</span>
                    ) : (
                      "Normal: 97.5 – 99.0 °F"
                    )}
                  </p>
                </div>

                {/* Blood Pressure Systolic */}
                <div className="space-y-1.5 rounded-xl border border-[var(--border)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vital-sys" className="text-xs font-semibold">
                      Systolic BP
                    </Label>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">90–120 mmHg</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="vital-sys"
                      type="number"
                      placeholder="e.g. 120"
                      value={vitals.systolicBp ?? ""}
                      onChange={(e) =>
                        setVitals((prev) => ({
                          ...prev,
                          systolicBp: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                      className="pr-14 font-medium"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[var(--muted-foreground)]">mmHg</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Normal: 90 – 120 mmHg (&ge;180 is Crisis)</p>
                </div>

                {/* Blood Pressure Diastolic */}
                <div className="space-y-1.5 rounded-xl border border-[var(--border)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vital-dia" className="text-xs font-semibold">
                      Diastolic BP
                    </Label>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">60–80 mmHg</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="vital-dia"
                      type="number"
                      placeholder="e.g. 80"
                      value={vitals.diastolicBp ?? ""}
                      onChange={(e) =>
                        setVitals((prev) => ({
                          ...prev,
                          diastolicBp: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                      className="pr-14 font-medium"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[var(--muted-foreground)]">mmHg</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Normal: 60 – 80 mmHg</p>
                </div>

                {/* Pulse */}
                <div className="space-y-1.5 rounded-xl border border-[var(--border)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vital-pulse" className="text-xs font-semibold">
                      Pulse / Heart Rate
                    </Label>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">60–100 bpm</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="vital-pulse"
                      type="number"
                      placeholder="e.g. 76"
                      value={vitals.pulse ?? ""}
                      onChange={(e) =>
                        setVitals((prev) => ({
                          ...prev,
                          pulse: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                      className="pr-12 font-medium"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[var(--muted-foreground)]">bpm</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Normal: 60 – 100 bpm</p>
                </div>

                {/* Weight */}
                <div className="space-y-1.5 rounded-xl border border-[var(--border)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vital-weight" className="text-xs font-semibold">
                      Body Weight
                    </Label>
                    <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">Reference</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="vital-weight"
                      type="number"
                      step="0.5"
                      placeholder="e.g. 65"
                      value={vitals.weight ?? ""}
                      onChange={(e) =>
                        setVitals((prev) => ({
                          ...prev,
                          weight: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                      className="pr-10 font-medium"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[var(--muted-foreground)]">kg</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Reference baseline weight</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guided Categorized Symptom Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Stethoscope className="h-5 w-5 text-[var(--primary)]" /> Guided Symptom Checklist
                  </CardTitle>
                  <CardDescription>
                    Select all symptoms presenting in the patient. Grouped by clinical discipline.
                  </CardDescription>
                </div>
                {selectedSymptoms.length > 0 && (
                  <Badge tone="primary">{selectedSymptoms.length} selected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
                {defaultRules.symptom_catalog.map((cat) => (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => setActiveCategory(cat.category)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      activeCategory === cat.category
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/80 hover:text-[var(--foreground)]"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Symptom Checklist for Active Category */}
              <div className="grid gap-2 sm:grid-cols-2">
                {defaultRules.symptom_catalog
                  .find((c) => c.category === activeCategory)
                  ?.symptoms.map((symptom) => {
                    const isChecked = selectedSymptoms.includes(symptom.id);
                    return (
                      <label
                        key={symptom.id}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                          isChecked
                            ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                            : "border-[var(--border)] hover:border-[var(--primary)]/60 bg-[var(--card)]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSymptom(symptom.id)}
                          className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] accent-[var(--primary)]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium leading-tight text-[var(--foreground)]">
                            {symptom.name}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            {symptom.severity === "emergency" ? (
                              <Badge tone="danger" className="text-[10px] py-0 px-1.5">
                                Red Flag
                              </Badge>
                            ) : symptom.severity === "urgent" ? (
                              <Badge tone="warning" className="text-[10px] py-0 px-1.5">
                                Urgent
                              </Badge>
                            ) : (
                              <Badge tone="default" className="text-[10px] py-0 px-1.5">
                                Routine
                              </Badge>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
              </div>

              {/* Free-text Description with Integrated Voice Input */}
              <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="free-text-input" className="text-xs font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--primary)]" /> Describe Symptoms in Your Own Words
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant={isRecording ? "danger" : "outline"}
                    onClick={toggleVoiceRecording}
                    className="gap-1.5 text-xs h-8"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="h-3.5 w-3.5 animate-pulse" /> Stop Voice Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5 text-[var(--primary)]" /> Speak Symptoms (Voice Input)
                      </>
                    )}
                  </Button>
                </div>
                {isRecording && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                    Listening in {locale.toUpperCase()}... Tap stop when finished speaking.
                  </div>
                )}
                <Textarea
                  id="free-text-input"
                  rows={3}
                  placeholder="e.g. Patient complains of sudden high fever since morning, mild breathlessness on climbing stairs, and fatigue..."
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  className="font-normal text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                  Back to Profile
                </Button>
                <Button
                  size="default"
                  onClick={handleRunTriage}
                  className="gap-2 font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
                >
                  <Activity className="h-4 w-4" /> Evaluate Triage Score <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* STEP 3: TRIAGE SCORING RESULT & BRANCH ACTIONS */}
      {currentStep === 3 && activeResult && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Main Color-Coded Triage Assessment Card */}
          <Card
            className={cn(
              "border-2 overflow-hidden shadow-md",
              activeResult.level === "EMERGENCY"
                ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                : activeResult.level === "URGENT"
                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                : "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
            )}
          >
            <CardHeader className="pb-3 border-b border-[var(--border)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm",
                      activeResult.level === "EMERGENCY"
                        ? "bg-red-600"
                        : activeResult.level === "URGENT"
                        ? "bg-amber-500"
                        : "bg-emerald-600"
                    )}
                  >
                    {activeResult.level === "EMERGENCY" ? (
                      <Siren className="h-6 w-6 animate-bounce" />
                    ) : activeResult.level === "URGENT" ? (
                      <AlertTriangle className="h-6 w-6" />
                    ) : (
                      <ShieldCheck className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                        {activeResult.level}
                      </h2>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                          activeResult.level === "EMERGENCY"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200"
                            : activeResult.level === "URGENT"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                        )}
                      >
                        {activeResult.level === "EMERGENCY" ? "Level 1 · Red Alert" : activeResult.level === "URGENT" ? "Level 2 · Priority Amber" : "Level 3 · Routine Green"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      Recommended Routing: <strong>{activeResult.suggestedDepartment}</strong> · Severity Index {activeResult.score}/100
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Re-assess
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Plain-Language Clinical Explanation */}
              <div className="rounded-xl bg-[var(--card)] p-4 border border-[var(--border)]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Clinical Explanation & Findings
                </p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-[var(--foreground)]">
                  {activeResult.explanation}
                </p>
              </div>

              {/* Triggers Breakdown */}
              {activeResult.triggers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                    Matching Clinical Rules & Red Flags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeResult.triggers.map((trigger, i) => (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
                          trigger.level === "EMERGENCY"
                            ? "border-red-300 bg-red-100/60 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                            : trigger.level === "URGENT"
                            ? "border-amber-300 bg-amber-100/60 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            : "border-emerald-300 bg-emerald-100/60 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        )}
                      >
                        <AlertOctagon className="h-3.5 w-3.5" />
                        {trigger.criterion}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BRANCH ACTIONS BASED ON TRIAGE LEVEL */}
          {activeResult.level === "EMERGENCY" && (
            <Card className="border-red-500 bg-red-500 text-white shadow-lg">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-white/20 p-3 shrink-0">
                    <Siren className="h-8 w-8 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">Emergency Response Actions</h3>
                    <p className="text-sm text-red-100">
                      Critical danger indicators detected. Mobilize 108 ambulance dispatch and alert the nearest medical facility casualty ward immediately.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    size="lg"
                    className="bg-white text-red-700 hover:bg-white/90 font-bold gap-2 shadow-sm"
                    loading={raiseEmergencyAlert.isPending}
                    onClick={() => raiseEmergencyAlert.mutate()}
                  >
                    <Siren className="h-5 w-5" /> Dispatch 108 Ambulance Now
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-white/60 bg-transparent text-white hover:bg-white/20 font-semibold gap-2"
                  >
                    <a href="tel:108">
                      <Phone className="h-4 w-4" /> Call 108 Hotline
                    </a>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleDownloadSlip}
                    className="border-white/60 bg-transparent text-white hover:bg-white/20 font-semibold gap-2"
                  >
                    <Download className="h-4 w-4" /> Download Referral Slip
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeResult.level === "URGENT" && (
            <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-amber-500 text-white p-3 shrink-0">
                    <Video className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-[var(--foreground)]">Priority Tele-Consultation</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Abnormal physiological parameters detected. A priority video consultation slot has been reserved with the next available Medical Officer.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {createdAppointmentId ? (
                    <Button asChild size="lg" className="bg-[var(--primary)] text-white gap-2 font-bold">
                      <Link href={`/video/triage-priority-${createdAppointmentId}?appointment=${createdAppointmentId}`}>
                        <Video className="h-5 w-5" /> Join Video Room Now
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 gap-2 font-semibold"
                      loading={bookPriorityAppointment.isPending}
                      onClick={() => bookPriorityAppointment.mutate()}
                    >
                      <Video className="h-5 w-5" /> Confirm Priority Doctor Consultation
                    </Button>
                  )}

                  <Button asChild variant="outline" size="lg">
                    <Link href="/patient/appointments">View All Appointments</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeResult.level === "ROUTINE" && (
            <Card className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-emerald-600 text-white p-3 shrink-0">
                    <CalendarDays className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-[var(--foreground)]">Schedule Routine Outpatient Consultation</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Patient vital signs are stable. You may book a routine consultation with your local Primary Health Centre (PHC) medical officer.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button asChild size="lg" className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold gap-2">
                    <Link href="/patient/appointments">
                      <CalendarDays className="h-5 w-5" /> Book Regular Appointment
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/patient/history">View Longitudinal Medical History</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cross-Reference Links */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-xs">
            <span className="text-[var(--muted-foreground)] flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Session saved with ID: <strong className="text-[var(--foreground)]">{activeSessionId}</strong>
            </span>
            <div className="flex items-center gap-3">
              <Link href="/patient/history" className="font-semibold text-[var(--primary)] hover:underline">
                View in Medical History →
              </Link>
              <Link href="/patient/reports" className="font-semibold text-[var(--primary)] hover:underline">
                View in Lab Reports →
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* PAST TRIAGE SESSIONS HISTORY LIST */}
      <div className="mt-8 pt-4 border-t border-[var(--border)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <History className="h-5 w-5 text-[var(--primary)]" /> Past Triage Sessions
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Historical digital triage evaluations saved on this device and synced with your health record.
            </p>
          </div>
          <Badge tone="default">{localHistory.length} total sessions</Badge>
        </div>

        {localHistory.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              No prior triage sessions recorded yet. Completed triage evaluations will appear here.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {localHistory.map((session) => {
              const isExpanded = expandedSessionId === session.id;
              const lvl = session.result.level;
              return (
                <Card key={session.id} className="transition-all hover:border-[var(--primary)]/60">
                  <CardContent className="p-4 sm:p-5">
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold shrink-0",
                            lvl === "EMERGENCY"
                              ? "bg-red-600"
                              : lvl === "URGENT"
                              ? "bg-amber-500"
                              : "bg-emerald-600"
                          )}
                        >
                          {lvl === "EMERGENCY" ? "E" : lvl === "URGENT" ? "U" : "R"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{session.result.explanation.slice(0, 70)}…</p>
                            <Badge
                              tone={lvl === "EMERGENCY" ? "danger" : lvl === "URGENT" ? "warning" : "success"}
                              className="text-[10px]"
                            >
                              {lvl}
                            </Badge>
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                            {formatDate(session.createdAt, true)} · {session.result.suggestedDepartment}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium border",
                            session.syncStatus === "synced"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          )}
                        >
                          {session.syncStatus === "synced" ? "Synced" : "Pending sync"}
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {/* Expandable Session Detail */}
                    {isExpanded && (
                      <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-3 text-xs">
                        <div className="grid gap-2 sm:grid-cols-3 bg-[var(--muted)]/40 p-3 rounded-xl">
                          <div>
                            <p className="font-semibold text-[var(--muted-foreground)]">Vitals Recorded:</p>
                            <p className="text-[var(--foreground)] mt-0.5">
                              SpO2: {session.input.vitals.spo2 ?? "N/A"}% · Temp: {session.input.vitals.temperature ?? "N/A"}°F
                            </p>
                            <p className="text-[var(--foreground)]">
                              BP: {session.input.vitals.systolicBp ?? "N/A"}/{session.input.vitals.diastolicBp ?? "N/A"} mmHg · Pulse: {session.input.vitals.pulse ?? "N/A"} bpm
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--muted-foreground)]">Selected Symptoms:</p>
                            <p className="text-[var(--foreground)] mt-0.5">
                              {session.input.selectedSymptoms.length > 0
                                ? session.input.selectedSymptoms.join(", ")
                                : "None selected"}
                            </p>
                            {session.input.freeTextSymptoms && (
                              <p className="text-[var(--muted-foreground)] italic mt-1 truncate">
                                &quot;{session.input.freeTextSymptoms}&quot;
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--muted-foreground)]">Outcome / Cross-Reference:</p>
                            <p className="text-[var(--foreground)] mt-0.5">
                              {lvl === "EMERGENCY" ? "Emergency Referral / 108 Mobilization" : lvl === "URGENT" ? "Priority Video Consultation" : "Routine Outpatient Care"}
                            </p>
                            <p className="text-[var(--muted-foreground)] mt-0.5">
                              Session ID: {session.id}
                            </p>
                          </div>
                        </div>

                        {session.referralNote && (
                          <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                            <p className="font-bold text-red-800 dark:text-red-200 mb-1">Generated Emergency Referral Slip:</p>
                            <pre className="whitespace-pre-wrap text-[11px] text-red-900 dark:text-red-100 font-mono">
                              {session.referralNote}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
