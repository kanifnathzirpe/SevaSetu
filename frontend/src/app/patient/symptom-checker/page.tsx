"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Bot, CheckCircle2, Send, Sparkles, Stethoscope } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { SymptomCheckResult } from "@/lib/types";
import { cn, RISK_STYLES } from "@/lib/utils";

interface Catalog {
  symptoms: string[];
  durations: number[];
  disclaimer: string;
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

export default function SymptomCheckerPage() {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [age, setAge] = React.useState(29);
  const [gender, setGender] = React.useState("female");
  const [duration, setDuration] = React.useState(3);
  const [notes, setNotes] = React.useState("");
  const [result, setResult] = React.useState<SymptomCheckResult | null>(null);

  const [chat, setChat] = React.useState<ChatTurn[]>([
    {
      role: "assistant",
      content:
        "Namaskar! I am the SevaSetu health assistant. Describe your symptoms in simple words and I will guide you to the right care.",
      suggestions: ["I have fever since 2 days", "Where is the nearest PHC?", "Is my BP reading normal?"],
    },
  ]);
  const [message, setMessage] = React.useState("");

  const { data: catalog } = useQuery({
    queryKey: ["symptoms", "catalog"],
    queryFn: () => api.get<Catalog>("/api/v1/symptoms/catalog"),
  });

  const check = useMutation({
    mutationFn: () =>
      api.post<SymptomCheckResult>("/api/v1/symptoms/check", {
        symptoms: selected,
        age,
        gender,
        duration_days: duration,
        additional_notes: notes,
      }),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Triage complete");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const ask = useMutation({
    mutationFn: (text: string) =>
      api.post<{ reply: string; suggestions: string[] }>("/api/v1/ai/chatbot", {
        message: text,
        history: chat.slice(-6).map((turn) => ({ role: turn.role, content: turn.content })),
      }),
    onSuccess: (data) =>
      setChat((previous) => [...previous, { role: "assistant", content: data.reply, suggestions: data.suggestions }]),
    onError: (error: Error) => toast.error(error.message),
  });

  function send(text: string) {
    if (!text.trim()) return;
    setChat((previous) => [...previous, { role: "user", content: text }]);
    setMessage("");
    ask.mutate(text);
  }

  function toggleSymptom(symptom: string) {
    setSelected((previous) =>
      previous.includes(symptom) ? previous.filter((item) => item !== symptom) : [...previous, symptom]
    );
  }

  return (
    <>
      <PageHeader
        title="AI symptom checker"
        description="Rule-based clinical triage for your area. Not a substitute for a doctor."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tell us what you are feeling</CardTitle>
            <CardDescription>Select all symptoms that apply</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(catalog?.symptoms ?? []).map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptom(symptom)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
                    selected.includes(symptom)
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--border)] hover:border-[var(--primary)]"
                  )}
                >
                  {symptom}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" min={0} max={120} value={age} onChange={(event) => setAge(Number(event.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Select id="gender" value={gender} onChange={(event) => setGender(event.target.value)}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (days)</Label>
                <Select id="duration" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                  {(catalog?.durations ?? [1, 2, 3, 5, 7, 14]).map((item) => (
                    <option key={item} value={item}>
                      {item} day{item > 1 ? "s" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="notes">Description of Symptom: </Label>
                <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Travel history, Symptom frequency, existing conditions, medicines taken…" />
              </div>
            </div>

            <Button
              className="mt-4"
              size="lg"
              disabled={selected.length === 0}
              loading={check.isPending}
              onClick={() => check.mutate()}
            >
              <Activity className="h-4 w-4" /> Analyse symptoms
            </Button>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">{catalog?.disclaimer}</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[var(--primary)]" /> Health assistant
            </CardTitle>
            <CardDescription>Ask anything about your health</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 420 }}>
              {chat.map((turn, index) => (
                <div key={index} className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm",
                      turn.role === "user"
                        ? "bg-[var(--primary)] text-white"
                        : "border border-[var(--border)] bg-[var(--muted)]"
                    )}
                  >
                    {turn.content}
                    {turn.suggestions?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {turn.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => send(suggestion)}
                            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs hover:border-[var(--primary)]"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {ask.isPending ? <p className="text-xs text-[var(--muted-foreground)]">Assistant is typing…</p> : null}
            </div>

            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                send(message);
              }}
            >
              <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type your question…" />
              <Button type="submit" size="icon" aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {result ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--primary)]" /> Possible conditions
              </CardTitle>
              <CardDescription>Ranked by symptom match — confirm with a medical officer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.predicted_conditions.map((condition) => (
                <div key={condition.condition}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{condition.condition}</p>
                    <span className="text-xs text-[var(--muted-foreground)]">{condition.confidence}% match</span>
                  </div>
                  <Progress className="mt-2" value={condition.confidence} />
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{condition.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Triage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <span className={cn("inline-flex rounded-full border px-3 py-1 text-sm font-semibold capitalize", RISK_STYLES[result.triage_level])}>
                  {result.triage_level} priority
                </span>
                <p className="text-sm">{result.recommended_action}</p>
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Suggested department</p>
                  <p className="mt-1 flex items-center gap-2 font-semibold">
                    <Stethoscope className="h-4 w-4 text-[var(--primary)]" /> {result.suggested_department}
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link href="/patient/appointments">Book with {result.suggested_department}</Link>
                </Button>
                {result.triage_level === "critical" || result.triage_level === "high" ? (
                  <Button asChild variant="danger" className="w-full">
                    <Link href="/patient/emergency">Raise emergency SOS</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {result.red_flags.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[var(--danger)]">
                    <AlertTriangle className="h-4 w-4" /> Red flags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {result.red_flags.map((flag) => (
                      <li key={flag} className="flex gap-2">
                        <span className="text-[var(--danger)]">•</span> {flag}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Self care</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {[...result.advice, ...result.self_care].map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" /> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      ) : null}
    </>
  );
}
