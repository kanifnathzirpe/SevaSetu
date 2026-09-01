"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Minimize2,
  Stethoscope,
  X,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { SymptomCheckResult } from "@/lib/types";
import { cn, RISK_STYLES } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Catalog {
  symptoms: string[];
  durations: number[];
  disclaimer: string;
}

type Step = "symptoms" | "details" | "analysing" | "result";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SymptomChatbot() {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);

  /* symptom checker state */
  const [step, setStep] = React.useState<Step>("symptoms");
  const [catalog, setCatalog] = React.useState<Catalog | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [age, setAge] = React.useState(29);
  const [gender, setGender] = React.useState("female");
  const [duration, setDuration] = React.useState(3);
  const [notes, setNotes] = React.useState("");
  const [result, setResult] = React.useState<SymptomCheckResult | null>(null);
  const [search, setSearch] = React.useState("");

  const scrollRef = React.useRef<HTMLDivElement>(null);

  /* Fetch catalog when first opened */
  React.useEffect(() => {
    if (open && !catalog) {
      api
        .get<Catalog>("/api/v1/symptoms/catalog")
        .then(setCatalog)
        .catch(() => {});
    }
  }, [open, catalog]);

  /* auto-scroll */
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [step, result, selected]);

  function toggleSymptom(s: string) {
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function analyse() {
    setStep("analysing");
    try {
      const data = await api.post<SymptomCheckResult>("/api/v1/symptoms/check", {
        symptoms: selected,
        age,
        gender,
        duration_days: duration,
        additional_notes: notes,
      });
      setResult(data);
      setStep("result");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("Analysis failed");
      toast.error(error.message);
      setStep("details");
    }
  }

  function reset() {
    setStep("symptoms");
    setSelected([]);
    setAge(29);
    setGender("female");
    setDuration(3);
    setNotes("");
    setResult(null);
    setSearch("");
  }

  const filteredSymptoms = (catalog?.symptoms ?? []).filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  /* ---- FAB button ---- */
  if (!open) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setOpen(true);
          setMinimized(false);
        }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-teal-600 text-white shadow-lg shadow-teal-500/25 transition-shadow hover:shadow-xl hover:shadow-teal-500/30 cursor-pointer"
        aria-label={t("symptom.title")}
      >
        <Stethoscope className="h-6 w-6" />
        <span className="absolute inset-0 animate-ping rounded-2xl bg-[var(--primary)] opacity-20" />
      </motion.button>
    );
  }

  /* ---- Panel ---- */
  return (
    <AnimatePresence>
      <motion.div
        key="symptom-panel"
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={
          minimized
            ? { opacity: 1, y: 0, scale: 1, height: 56 }
            : { opacity: 1, y: 0, scale: 1, height: "auto" }
        }
        exit={{ opacity: 0, y: 40, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="fixed bottom-6 right-6 z-50 flex w-[390px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        style={{ maxHeight: minimized ? 56 : "min(620px, calc(100vh - 6rem))" }}
      >
        {/* ---- Header ---- */}
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)] to-teal-600 px-4 py-3 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{t("symptom.title")}</p>
            <p className="text-[11px] leading-tight opacity-80">
              {step === "symptoms" && t("symptom.subtitle")}
              {step === "details" && t("symptom.details")}
              {step === "analysing" && t("symptom.analysing")}
              {step === "result" && t("symptom.results")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMinimized((p) => !p)}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/20 cursor-pointer"
            aria-label={minimized ? "Expand" : "Minimize"}
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/20 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ---- Body ---- */}
        {!minimized && (
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {/* ======== STEP 1: Symptom selection ======== */}
            {step === "symptoms" && (
              <div className="p-4 space-y-4">
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("symptom.greeting")}
                </p>

                {/* Search */}
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("symptom.search")}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                />

                {/* Symptom chips */}
                <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                  {filteredSymptoms.map((symptom) => (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs capitalize transition-colors cursor-pointer",
                        selected.includes(symptom)
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] bg-[var(--muted)] hover:border-[var(--primary)]"
                      )}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>

                {/* Selected count */}
                {selected.length > 0 && (
                  <p className="text-xs text-[var(--primary)] font-medium">
                    {selected.length} {t("symptom.selected")}
                  </p>
                )}

                <Button
                  className="w-full"
                  disabled={selected.length === 0}
                  onClick={() => setStep("details")}
                >
                  {t("symptom.continue")}
                </Button>
              </div>
            )}

            {/* ======== STEP 2: Additional details ======== */}
            {step === "details" && (
              <div className="p-4 space-y-4">
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("symptom.details")}
                </p>

                {/* Selected symptoms summary */}
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-2.5 py-1 text-xs text-white capitalize"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => toggleSymptom(s)}
                        className="ml-0.5 hover:text-white/70 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-foreground)]">{t("symptom.age")}</label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 py-2 text-sm outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-foreground)]">{t("symptom.gender")}</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 py-2 text-sm outline-none focus:border-[var(--primary)]"
                    >
                      <option value="female">{t("symptom.female")}</option>
                      <option value="male">{t("symptom.male")}</option>
                      <option value="other">{t("symptom.other")}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--muted-foreground)]">{t("symptom.duration")}</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 py-2 text-sm outline-none focus:border-[var(--primary)]"
                    >
                      {(catalog?.durations ?? [1, 2, 3, 5, 7, 14]).map((d) => (
                        <option key={d} value={d}>
                          {d} {d > 1 ? t("symptom.days") : t("symptom.day")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">
                    {t("symptom.anythingElse")}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("symptom.notesPlaceholder")}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] resize-none"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setStep("symptoms")}
                  >
                    {t("symptom.back")}
                  </Button>
                  <Button className="flex-1" onClick={analyse}>
                    <Activity className="h-4 w-4" /> {t("symptom.analyse")}
                  </Button>
                </div>
              </div>
            )}

            {/* ======== STEP 3: Analysing ======== */}
            {step === "analysing" && (
              <div className="flex flex-col items-center justify-center p-8 gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                >
                  <Activity className="h-10 w-10 text-[var(--primary)]" />
                </motion.div>
                <p className="text-sm font-medium">{t("symptom.analysing")}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {selected.length} {t("symptom.selected")}
                </p>
              </div>
            )}

            {/* ======== STEP 4: Results ======== */}
            {step === "result" && result && (
              <div className="p-4 space-y-4">
                {/* Triage badge */}
                <div className="rounded-xl border border-[var(--border)] p-3 text-center">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1 text-sm font-semibold capitalize",
                      RISK_STYLES[result.triage_level]
                    )}
                  >
                    {result.triage_level} {t("symptom.priority")}
                  </span>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {result.recommended_action}
                  </p>
                </div>

                {/* Suggested department */}
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-3">
                  <Stethoscope className="h-4 w-4 text-[var(--primary)]" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                      {t("symptom.suggestedDept")}
                    </p>
                    <p className="text-sm font-semibold">{result.suggested_department}</p>
                  </div>
                </div>

                {/* Conditions */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    {t("symptom.possibleCond")}
                  </p>
                  {result.predicted_conditions.map((c) => (
                    <div key={c.condition}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{c.condition}</p>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {c.confidence}%
                        </span>
                      </div>
                      <Progress className="mt-1" value={c.confidence} />
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        {c.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Red flags */}
                {result.red_flags.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5" /> {t("symptom.redFlags")}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {result.red_flags.map((f) => (
                        <li key={f} className="text-xs text-red-600 dark:text-red-400">
                          • {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Self care */}
                {(result.advice.length > 0 || result.self_care.length > 0) && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {t("symptom.selfCare")}
                    </p>
                    {[...result.advice, ...result.self_care].map((item) => (
                      <p key={item} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                        {item}
                      </p>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button asChild className="flex-1" size="sm">
                    <Link href="/patient/appointments">
                      {t("symptom.bookAppt")}
                    </Link>
                  </Button>
                  {(result.triage_level === "critical" ||
                    result.triage_level === "high") && (
                    <Button asChild variant="danger" size="sm" className="flex-1">
                      <Link href="/patient/emergency">{t("symptom.emergencySOS")}</Link>
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={reset}
                >
                  {t("symptom.checkNew")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer footer */}
        {!minimized && step !== "analysing" && (
          <p className="border-t border-[var(--border)] px-4 py-2 text-[10px] leading-tight text-[var(--muted-foreground)]">
            {t("symptom.disclaimer")}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
