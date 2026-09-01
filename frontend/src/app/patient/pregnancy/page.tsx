"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Baby, CheckCircle2, HeartPulse, Stethoscope } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Pregnancy } from "@/lib/types";
import { cn, formatDate, RISK_STYLES } from "@/lib/utils";

interface Insights {
  has_record: boolean;
  gestation_weeks?: number;
  edd?: string;
  risk_level: string;
  reasons: string[];
  milestones: { week: number; label: string; done: boolean }[];
  anc_visits_completed?: number;
}

export default function PregnancyPage() {
  const { data: record, isLoading } = useQuery({
    queryKey: ["patient", "pregnancy"],
    queryFn: () => api.get<Pregnancy | null>("/api/v1/patient/pregnancy"),
  });

  const { data: insights } = useQuery({
    queryKey: ["patient", "pregnancy", "insights"],
    queryFn: () => api.get<Insights>("/api/v1/patient/pregnancy/insights"),
  });

  if (isLoading) return <LoadingBlock rows={5} />;

  if (!record) {
    return (
      <>
        <PageHeader title="Pregnancy tracking" description="Antenatal care under Janani Suraksha Yojana" />
        <EmptyState
          icon={Baby}
          title="No active pregnancy record"
          description="Your ASHA worker registers pregnancies during a household visit. Contact your ASHA worker to register."
          action={
            <Button asChild size="sm">
              <Link href="/chat">Message my ASHA worker</Link>
            </Button>
          }
        />
      </>
    );
  }

  const progress = Math.min(100, Math.round((record.gestation_weeks / 40) * 100));

  return (
    <>
      <PageHeader
        title="Pregnancy tracking"
        description={`Week ${record.gestation_weeks} of 40 · expected delivery ${formatDate(record.edd_date)}`}
        actions={
          <span className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold capitalize", RISK_STYLES[record.risk_level])}>
            {record.risk_level} risk
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gestation progress</CardTitle>
            <CardDescription>Trimester {record.gestation_weeks <= 13 ? "one" : record.gestation_weeks <= 27 ? "two" : "three"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Progress value={progress} className="flex-1" />
              <span className="text-sm font-semibold">{progress}%</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Haemoglobin", `${record.hemoglobin} g/dL`],
                ["Blood pressure", `${record.bp_systolic}/${record.bp_diastolic}`],
                ["Weight", `${record.weight_kg} kg`],
                ["ANC visits", `${record.anc_visits_completed} of 4`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[var(--muted)] p-4">
                  <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
                  <p className="mt-1 text-lg font-bold">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">Antenatal care milestones</p>
              <ol className="space-y-3">
                {(insights?.milestones ?? []).map((milestone) => (
                  <li key={milestone.week} className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        milestone.done
                          ? "bg-[var(--success)] text-white"
                          : "border border-[var(--border)] text-[var(--muted-foreground)]"
                      )}
                    >
                      {milestone.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : milestone.week}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{milestone.label}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Week {milestone.week}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> Risk assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge tone={insights?.risk_level === "high" || insights?.risk_level === "critical" ? "danger" : insights?.risk_level === "moderate" ? "warning" : "success"}>
                {insights?.risk_level ?? record.risk_level} risk
              </Badge>
              {(insights?.reasons ?? []).length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No risk factors flagged. Continue routine ANC visits.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {insights?.reasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <span className="text-[var(--warning)]">•</span> {reason}
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild className="w-full">
                <Link href="/patient/appointments">
                  <Stethoscope className="h-4 w-4" /> Book ANC checkup
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-[var(--danger)]" /> Danger signs
              </CardTitle>
              <CardDescription>Call 108 immediately if any occur</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {[
                  "Bleeding from the vagina",
                  "Severe headache with blurred vision",
                  "Convulsions or fits",
                  "High fever with chills",
                  "Reduced or no fetal movement",
                  "Severe abdominal pain",
                ].map((sign) => (
                  <li key={sign} className="flex gap-2">
                    <span className="text-[var(--danger)]">•</span> {sign}
                  </li>
                ))}
              </ul>
              <Button asChild variant="danger" className="mt-4 w-full">
                <Link href="/patient/emergency">Emergency SOS</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
