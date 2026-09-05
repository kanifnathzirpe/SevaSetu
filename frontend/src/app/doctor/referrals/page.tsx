"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { NewReferralModal } from "@/components/new-referral-modal";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { Referral } from "@/lib/types";
import { cn, formatDate, RISK_STYLES, titleCase } from "@/lib/utils";

export default function DoctorReferralsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"all" | "outgoing" | "incoming">("all");
  const [search, setSearch] = React.useState("");
  const [urgencyFilter, setUrgencyFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["doctor", "referrals", activeTab, statusFilter, urgencyFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("direction", activeTab);
      if (statusFilter) params.set("status", statusFilter);
      if (urgencyFilter) params.set("urgency", urgencyFilter);
      if (search) params.set("search", search);
      const query = params.toString();
      return api.get<Referral[]>(`/api/v1/doctor/referrals${query ? `?${query}` : ""}`);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      api.patch<Referral>(`/api/v1/doctor/referrals/${id}/status`, { status, notes }),
    onSuccess: (data) => {
      toast.success(`Referral status updated to ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ["doctor", "referrals"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Calculate high-level metrics
  const metrics = React.useMemo(() => {
    const total = referrals.length;
    const openCount = referrals.filter((r) => r.status === "open").length;
    const acceptedCount = referrals.filter((r) => r.status === "accepted").length;
    const highUrgency = referrals.filter(
      (r) => r.urgency === "high" || r.urgency === "critical"
    ).length;
    return { total, openCount, acceptedCount, highUrgency };
  }, [referrals]);

  return (
    <>
      <PageHeader
        title="Patient Referrals"
        description="Refer patients to peer doctors and specialist departments, track transfer cases, and review inbound referrals"
        actions={<NewReferralModal />}
      />

      {/* KPI Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-[var(--border)]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-[var(--primary)]/10 p-3 text-[var(--primary)]">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">Total Referrals</p>
              <p className="text-2xl font-bold">{metrics.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">Open / Pending</p>
              <p className="text-2xl font-bold">{metrics.openCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">Accepted Cases</p>
              <p className="text-2xl font-bold">{metrics.acceptedCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-red-500/10 p-3 text-red-600 dark:text-red-400">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">High / Critical Urgency</p>
              <p className="text-2xl font-bold">{metrics.highUrgency}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Tab Navigation Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "all" | "outgoing" | "incoming")}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="all">All Referrals</TabsTrigger>
            <TabsTrigger value="outgoing">Referred by You</TabsTrigger>
            <TabsTrigger value="incoming">Referred to You</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, doctor, reason…"
              className="pl-9 text-xs"
            />
          </div>

          <Select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="w-32 text-xs"
          >
            <option value="">All Urgency</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-32 text-xs"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="accepted">Accepted</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
      </div>

      {/* Referrals List */}
      {isLoading ? (
        <LoadingBlock rows={4} />
      ) : referrals.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No referrals found"
          description="Use the button above to refer a patient to a colleague doctor or specialist department."
          action={<NewReferralModal />}
        />
      ) : (
        <div className="space-y-3">
          {referrals.map((referral) => {
            const isOutgoing = referral.referred_by_name?.includes("You");

            return (
              <Card
                key={referral.id}
                className="transition-all hover:border-[var(--primary)]/40 hover:shadow-sm"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/doctor/patients/${referral.patient_id}`}
                          className="font-semibold hover:text-[var(--primary)] transition-colors text-base"
                        >
                          {referral.patient_name || `Patient #${referral.patient_id}`}
                        </Link>

                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                            RISK_STYLES[referral.urgency]
                          )}
                        >
                          {referral.urgency}
                        </span>

                        <Badge
                          tone={
                            referral.status === "closed"
                              ? "success"
                              : referral.status === "accepted"
                              ? "info"
                              : "warning"
                          }
                        >
                          {titleCase(referral.status)}
                        </Badge>

                        {isOutgoing ? (
                          <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            Outgoing Referral
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            Incoming Referral
                          </span>
                        )}
                      </div>

                      {/* Doctor and Facility routing details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                        {referral.to_doctor_name ? (
                          <span className="flex items-center gap-1 font-medium text-[var(--foreground)]">
                            <Stethoscope className="h-3.5 w-3.5 text-[var(--primary)]" />
                            Referred to: {referral.to_doctor_name}
                            {referral.to_doctor_specialization
                              ? ` (${referral.to_doctor_specialization})`
                              : ""}
                          </span>
                        ) : referral.specialty ? (
                          <span className="flex items-center gap-1 font-medium text-[var(--foreground)]">
                            <Stethoscope className="h-3.5 w-3.5 text-[var(--primary)]" />
                            Specialty: {referral.specialty}
                          </span>
                        ) : null}

                        {referral.to_hospital_name ? (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            Facility: {referral.to_hospital_name}
                          </span>
                        ) : null}

                        {referral.referred_by_name ? (
                          <span className="flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5" />
                            From: {referral.referred_by_name}
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
                        {referral.notes ? (
                          <p className="mt-1 text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] pt-1">
                            Notes: {referral.notes}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/doctor/patients/${referral.patient_id}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> View chart
                        </Link>
                      </Button>

                      {referral.status === "open" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({ id: referral.id, status: "accepted" })
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-blue-500" /> Accept
                        </Button>
                      )}

                      {referral.status !== "closed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({ id: referral.id, status: "closed" })
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Mark completed
                        </Button>
                      )}

                      <Button asChild size="sm" variant="ghost">
                        <Link href="/chat">
                          <MessageSquare className="h-3.5 w-3.5 mr-1" /> Chat
                        </Link>
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
