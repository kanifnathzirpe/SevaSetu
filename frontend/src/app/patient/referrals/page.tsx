"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Stethoscope,
  UserRound,
} from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getLocalTriageHistory } from "@/lib/triage";
import type { Referral } from "@/lib/types";
import { cn, formatDate, RISK_STYLES, titleCase } from "@/lib/utils";

// Status mapping from backend enum to patient-friendly labels
const STATUS_CONFIG: Record<string, { label: string; description: string; tone: "success" | "info" | "warning" | "danger" }> = {
  open: {
    label: "Pending",
    description: "Waiting for the referred doctor to review this referral.",
    tone: "warning",
  },
  accepted: {
    label: "Accepted",
    description: "Your referral has been accepted by the referred doctor.",
    tone: "info",
  },
  closed: {
    label: "Completed",
    description: "Your referral has been completed.",
    tone: "success",
  },
};

// Status timeline stages
const TIMELINE_STAGES = [
  { key: "created", label: "Referral Created" },
  { key: "sent", label: "Sent to Specialist" },
  { key: "accepted", label: "Accepted" },
  { key: "in_progress", label: "Consultation / In Progress" },
  { key: "completed", label: "Completed" },
] as const;

function getStatusStage(status: string): number {
  switch (status) {
    case "open":
      return 1; // Sent to specialist
    case "accepted":
      return 2; // Accepted
    case "closed":
      return 4; // Completed
    default:
      return 0;
  }
}

function ReferralTimeline({ status }: { status: string }) {
  const currentStage = getStatusStage(status);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;

  return (
    <div className="mb-4 rounded-lg bg-[var(--muted)] p-4">
      <p className="mb-3 text-sm font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
        Status Timeline
      </p>
      <div className="relative flex items-center justify-between">
        {TIMELINE_STAGES.map((stage, index) => {
          const isCompleted = index < currentStage;
          const isCurrent = index === currentStage;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold",
                    isCompleted
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : isCurrent
                      ? "border-[var(--primary)] bg-white text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <p
                  className={cn(
                    "text-xs font-medium",
                    isCurrent ? "text-[var(--primary)]" : isCompleted ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                  )}
                >
                  {stage.label}
                </p>
              </div>
              {index < TIMELINE_STAGES.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    isCompleted ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">{config.description}</p>
    </div>
  );
}

function ReferralDetails({ referral }: { referral: Referral }) {
  return (
    <div className="space-y-3 rounded-lg bg-[var(--muted)] p-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
            Referring Doctor
          </p>
          <p className="font-medium text-[var(--foreground)]">{referral.referred_by_name || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
            Referred To
          </p>
          <p className="font-medium text-[var(--foreground)]">
            {referral.to_doctor_name
              ? `Dr. ${referral.to_doctor_name.replace(/^Dr\. /, "")}${referral.to_doctor_specialization ? ` (${referral.to_doctor_specialization})` : ""}`
              : referral.specialty || "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
            Facility
          </p>
          <p className="font-medium text-[var(--foreground)]">{referral.to_hospital_name || referral.from_facility || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
            Created Date
          </p>
          <p className="font-medium text-[var(--foreground)]">{formatDate(referral.created_at)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
            Urgency
          </p>
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
              RISK_STYLES[referral.urgency]
            )}
          >
            {referral.urgency}
          </span>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
            Status
          </p>
          <Badge tone={STATUS_CONFIG[referral.status]?.tone || "warning"}>
            {STATUS_CONFIG[referral.status]?.label || titleCase(referral.status)}
          </Badge>
        </div>
      </div>
      {referral.notes && (
        <div className="border-t border-[var(--border)] pt-3">
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
            Notes
          </p>
          <p className="text-[var(--foreground)]">{referral.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function PatientReferralsPage() {
  const [selectedReferral, setSelectedReferral] = React.useState<Referral | null>(null);

  const { data: referrals = [], isLoading, error } = useQuery({
    queryKey: ["patient", "referrals"],
    queryFn: () => api.get<Referral[]>("/api/v1/patient/referrals"),
  });

  const mergedReferrals = React.useMemo(() => {
    const local = getLocalTriageHistory();
    const localReferrals: Referral[] = local
      .filter((s) => s.result.level === "EMERGENCY" && s.referralNote)
      .map((s, index) => ({
        id: -(index + 200),
        patient_id: s.patientId || 1,
        patient_name: s.patientName,
        referred_by_id: 1,
        referred_by_name: "SevaSetu Digital Triage Protocol",
        to_doctor_id: null,
        to_doctor_name: "Emergency Casualty MO",
        to_doctor_specialization: s.result.suggestedDepartment,
        to_hospital_name: "Nearest Casualty / Trauma Centre",
        from_facility: "Digital Triage Point",
        reason: `[DIGITAL TRIAGE EMERGENCY] ${s.result.explanation}`,
        urgency: "critical" as const,
        status: "open" as const,
        notes: s.referralNote || "",
        created_at: s.createdAt,
      }));

    const existingReasons = new Set(referrals.map((r) => r.reason));
    const uniqueLocal = localReferrals.filter((r) => !existingReasons.has(r.reason));
    return [...uniqueLocal, ...referrals];
  }, [referrals]);

  // Calculate summary metrics
  const metrics = React.useMemo(() => {
    const total = mergedReferrals.length;
    const pending = mergedReferrals.filter((r) => r.status === "open").length;
    const inProgress = mergedReferrals.filter((r) => r.status === "accepted").length;
    const completed = mergedReferrals.filter((r) => r.status === "closed").length;
    return { total, pending, inProgress, completed };
  }, [mergedReferrals]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Referrals" description="Track referrals sent by your doctor and follow their current status." />
        <LoadingBlock />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Referrals" description="Track referrals sent by your doctor and follow their current status." />
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">Unable to load referrals. Please try again later.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  if (selectedReferral) {
    return (
      <>
        <PageHeader
          title="Referral Details"
          description="View the complete details and status of your referral."
          actions={
            <Button size="sm" variant="outline" onClick={() => setSelectedReferral(null)}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Back to List
            </Button>
          }
        />
        <ReferralTimeline status={selectedReferral.status} />
        <Card>
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">{selectedReferral.reason}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">Referral ID: #{selectedReferral.id}</p>
            </div>
            <ReferralDetails referral={selectedReferral} />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Referrals" description="Track referrals sent by your doctor and follow their current status." />

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-[#EAF4FC] dark:bg-[#1D5FA7]/20 p-3 text-[#1D5FA7] dark:text-[#5FA9E6]">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Total Referrals</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{metrics.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 text-[#D97706] dark:text-amber-300">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Pending</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{metrics.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3 text-[#2563EB] dark:text-blue-300">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">In Progress</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{metrics.inProgress}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-[#059669] dark:text-emerald-300">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Completed</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{metrics.completed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrals List */}
      {mergedReferrals.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No referrals yet"
          description="Referrals from your doctors or digital triage will appear here."
        />
      ) : (
        <div className="space-y-3">
          {mergedReferrals.map((referral) => {
            const config = STATUS_CONFIG[referral.status] || STATUS_CONFIG.open;
            const isTriage = referral.reason.includes("TRIAGE") || referral.notes?.includes("TRIAGE");

            return (
              <Card
                key={referral.id}
                className="transition-all hover:border-[var(--primary)]/40 hover:shadow-sm cursor-pointer"
                onClick={() => setSelectedReferral(referral)}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-base text-[var(--foreground)]">{referral.reason}</h3>

                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                            RISK_STYLES[referral.urgency]
                          )}
                        >
                          {referral.urgency}
                        </span>

                        <Badge tone={config.tone}>{config.label}</Badge>

                        {isTriage && (
                          <Badge tone="danger" className="text-[10px]">
                            ⚡ Digital Triage Emergency
                          </Badge>
                        )}
                      </div>

                      {/* Doctor and Facility details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                        {referral.referred_by_name && (
                          <span className="flex items-center gap-1 font-medium text-[var(--foreground)]">
                            <UserRound className="h-3.5 w-3.5 text-[var(--primary)]" />
                            Referred by: {referral.referred_by_name}
                          </span>
                        )}

                        {referral.to_doctor_name ? (
                          <span className="flex items-center gap-1 font-medium text-[var(--foreground)]">
                            <Stethoscope className="h-3.5 w-3.5 text-[var(--primary)]" />
                            To: Dr. {referral.to_doctor_name.replace(/^Dr\. /, "")}
                            {referral.to_doctor_specialization ? ` (${referral.to_doctor_specialization})` : ""}
                          </span>
                        ) : referral.specialty ? (
                          <span className="flex items-center gap-1 font-medium text-[var(--foreground)]">
                            <Stethoscope className="h-3.5 w-3.5 text-[var(--primary)]" />
                            To: {referral.specialty}
                          </span>
                        ) : null}

                        {referral.to_hospital_name ? (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            Facility: {referral.to_hospital_name}
                          </span>
                        ) : null}

                        <span>Date: {formatDate(referral.created_at)}</span>
                      </div>

                      {/* Clinical Reason */}
                      <div className="rounded-lg bg-[var(--accent)]/50 p-3 text-sm">
                        <p className="font-medium text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                          Clinical Reason
                        </p>
                        <p className="text-[var(--foreground)]">{referral.reason}</p>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
