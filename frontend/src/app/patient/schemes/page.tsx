"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Award,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  PhoneCall,
  Pill,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { GovernmentScheme, SchemeEvaluationResult } from "@/lib/types";
import { cn, downloadTextFile } from "@/lib/utils";

const SCHEME_CATEGORIES = [
  { id: "all", label: "schemes.allSchemes" },
  { id: "hospitalization", label: "schemes.hospitalization", match: "Hospitalization" },
  { id: "maternal", label: "schemes.maternal", match: "Maternal" },
  { id: "free_drugs", label: "schemes.freeDrugs", match: "Free" },
  { id: "chronic", label: "schemes.chronic", match: "Chronic" },
  { id: "senior", label: "schemes.senior", match: "Senior" },
];

export default function PatientSchemesPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedScheme, setSelectedScheme] = React.useState<GovernmentScheme | null>(null);
  const [claimModalOpen, setClaimModalOpen] = React.useState(false);
  const [simModalOpen, setSimModalOpen] = React.useState(false);

  // Custom simulator state
  const [simForm, setSimForm] = React.useState({
    full_name: "",
    age: 28,
    gender: "female",
    locality: "Hadapsar, Pune",
    chronic_conditions: "Anaemia",
    is_pregnant: false,
    ration_card: "Orange",
    annual_income: "₹1,20,000",
  });

  const { data: initialData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["patient", "schemes"],
    queryFn: () => api.get<SchemeEvaluationResult>("/api/v1/patient/schemes"),
  });

  const [currentData, setCurrentData] = React.useState<SchemeEvaluationResult | null>(null);

  React.useEffect(() => {
    if (initialData) {
      setCurrentData(initialData);
      setSimForm((prev) => ({
        ...prev,
        full_name: initialData.patient_profile_evaluated.full_name,
        age: initialData.patient_profile_evaluated.age,
        gender: initialData.patient_profile_evaluated.gender,
        locality: initialData.patient_profile_evaluated.locality,
        chronic_conditions: initialData.patient_profile_evaluated.chronic_conditions || "None",
        is_pregnant: initialData.patient_profile_evaluated.is_pregnant,
      }));
    }
  }, [initialData]);

  const checkCustom = useMutation({
    mutationFn: (payload: typeof simForm) =>
      api.post<SchemeEvaluationResult>("/api/v1/patient/schemes/check", payload),
    onSuccess: (res) => {
      setCurrentData(res);
      setSimModalOpen(false);
      toast.success(t("schemes.eligibilityCalculated"));
    },
    onError: () => toast.error(t("schemes.eligibilityFailed")),
  });

  if (isLoading || !currentData) return <LoadingBlock rows={8} />;

  const { summary, patient_profile_evaluated, eligible_schemes, other_schemes } = currentData;

  const allSchemes = [...eligible_schemes, ...other_schemes];

  const filteredSchemes = allSchemes.filter((scheme) => {
    // Category match
    const categoryObj = SCHEME_CATEGORIES.find((c) => c.id === activeTab);
    const matchesCategory =
      activeTab === "all" ||
      (categoryObj?.match &&
        (scheme.category.toLowerCase().includes(categoryObj.match.toLowerCase()) ||
          scheme.name.toLowerCase().includes(categoryObj.match.toLowerCase())));

    // Search match
    const matchesSearch =
      !searchQuery.trim() ||
      scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.benefits.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const handleDownloadCertificate = () => {
    const lines = [
      "=================================================================",
      "               SEVASETU PUBLIC HEALTH ASSURANCE SLIP             ",
      "                 GOVERNMENT OF MAHARASHTRA / INDIA               ",
      "=================================================================",
      `Beneficiary Name  : ${patient_profile_evaluated.full_name}`,
      `SevaSetu Health ID: ${patient_profile_evaluated.health_id}`,
      `ABHA Number       : ${patient_profile_evaluated.abha_number || "Verified"}`,
      `Age / Gender      : ${patient_profile_evaluated.age} yrs / ${patient_profile_evaluated.gender.toUpperCase()}`,
      `Locality / State  : ${patient_profile_evaluated.locality}, ${patient_profile_evaluated.state}`,
      `Verification Date : ${new Date().toLocaleDateString()}`,
      "-----------------------------------------------------------------",
      "ELIGIBLE HEALTH SCHEMES SUMMARY:",
      `Total Annual Hospitalization Cover: ${summary.total_coverage}`,
      `Eligible Direct Schemes            : ${summary.eligible_count} Schemes`,
      "-----------------------------------------------------------------",
      "QUALIFIED GOVERNMENT SCHEMES & ENTITLEMENTS:",
      ...eligible_schemes.map(
        (s, i) =>
          `\n${i + 1}. ${s.name}\n   • Authority: ${s.authority}\n   • Coverage: ${s.coverage_amount}\n   • Status: ${s.status} (${s.match_score}% Match)\n   • Key Helpline: ${s.helpline}\n   • Required Docs: ${s.required_documents.join(", ")}`
      ),
      "\n-----------------------------------------------------------------",
      "HOW TO AVAIL CASHLESS TREATMENT AT NETWORK HOSPITALS:",
      "1. Present this digital slip along with your Aadhaar/ABHA card at the hospital Ayushman Mitra / Arogyamitra helpdesk.",
      "2. The hospital will authenticate via digital biometric or OTP e-KYC.",
      "3. 100% Cashless secondary/tertiary care will be authorized immediately.",
      "=================================================================",
    ];
    downloadTextFile(`sevasetu-schemes-${patient_profile_evaluated.health_id}.txt`, lines.join("\n"));
    toast.success(t("schemes.certificateDownloaded"));
  };

  return (
    <>
      <PageHeader
        title={t("schemes.title")}
        description={t("schemes.description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={simModalOpen} onOpenChange={setSimModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <SlidersHorizontal className="h-4 w-4" /> {t("schemes.checkFamily")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("schemes.simulatorTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("schemes.simulatorDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("schemes.beneficiaryName")}</Label>
                      <Input
                        value={simForm.full_name}
                        onChange={(e) => setSimForm({ ...simForm, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("schemes.ageYears")}</Label>
                      <Input
                        type="number"
                        value={simForm.age}
                        onChange={(e) => setSimForm({ ...simForm, age: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("schemes.gender")}</Label>
                      <select
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-2 text-sm"
                        value={simForm.gender}
                        onChange={(e) => setSimForm({ ...simForm, gender: e.target.value })}
                      >
                        <option value="female">{t("schemes.female")}</option>
                        <option value="male">{t("schemes.male")}</option>
                        <option value="other">{t("schemes.other")}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("schemes.rationCard")}</Label>
                      <select
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-2 text-sm"
                        value={simForm.ration_card}
                        onChange={(e) => setSimForm({ ...simForm, ration_card: e.target.value })}
                      >
                        <option value="Yellow">{t("schemes.rationYellow")}</option>
                        <option value="Orange">{t("schemes.rationOrange")}</option>
                        <option value="White">{t("schemes.rationWhite")}</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t("schemes.locality")}</Label>
                    <Input
                      value={simForm.locality}
                      onChange={(e) => setSimForm({ ...simForm, locality: e.target.value })}
                      placeholder={t("schemes.localityPlaceholder")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t("schemes.chronicCond")}</Label>
                    <Input
                      value={simForm.chronic_conditions}
                      onChange={(e) => setSimForm({ ...simForm, chronic_conditions: e.target.value })}
                      placeholder={t("schemes.chronicPlaceholder")}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="is_pregnant_sim"
                      checked={simForm.is_pregnant}
                      onChange={(e) => setSimForm({ ...simForm, is_pregnant: e.target.checked })}
                      className="h-4 w-4 rounded text-[var(--primary)]"
                    />
                    <Label htmlFor="is_pregnant_sim" className="cursor-pointer text-sm font-normal">
                      {t("schemes.isPregnant")}
                    </Label>
                  </div>

                  <Button
                    className="w-full mt-3 gap-2"
                    loading={checkCustom.isPending}
                    onClick={() => checkCustom.mutate(simForm)}
                  >
                    <Sparkles className="h-4 w-4" /> {t("schemes.evaluate")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button size="sm" onClick={handleDownloadCertificate} className="gap-1.5">
              <Download className="h-4 w-4" /> {t("schemes.downloadSlip")}
            </Button>
          </div>
        }
      />

      {/* Top Banner Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {t("schemes.totalCover")}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{summary.total_coverage}</p>
            <p className="mt-1 text-xs text-[#16A34A] font-medium">{t("schemes.pmjayCombined")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {t("schemes.directEligible")}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{summary.eligible_count} Schemes</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t("schemes.matchedProfile")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {t("schemes.freeBenefits")}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-300">
                <Pill className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{t("schemes.medicinesLabs")}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t("schemes.zeroFee")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {t("schemes.abhaAuth")}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[#D97706] dark:text-amber-300">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-base font-bold text-[var(--foreground)] truncate">
              {patient_profile_evaluated.abha_number || t("schemes.activeAbha")}
            </p>
            <p className="mt-1 text-xs text-[#16A34A] font-medium">{t("schemes.verifiedEkyc")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient Profile Evaluation Summary Bar */}
      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{patient_profile_evaluated.full_name}</p>
                <Badge tone="success" className="text-[10px] py-0 px-1.5">
                  {t("schemes.verifiedProfile")}
                </Badge>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("schemes.age")}: {patient_profile_evaluated.age} {t("schemes.yrs")} · {patient_profile_evaluated.gender.toUpperCase()} ·{" "}
                {patient_profile_evaluated.locality} · {t("schemes.condition")}:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {patient_profile_evaluated.chronic_conditions || t("schemes.noneRecorded")}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
              {t("schemes.syncRecords")}
            </Button>
            <Button size="sm" variant="secondary" className="gap-1.5 text-xs" onClick={() => setSimModalOpen(true)}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("schemes.editCriteria")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs & Search Bar */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex overflow-x-auto pb-1 gap-1.5">
          {SCHEME_CATEGORIES.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder={t("schemes.searchPlaceholder")}
            className="pl-8 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Schemes Grid */}
      <div className="mt-4 space-y-4">
        {filteredSchemes.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title={t("schemes.noMatching")}
            description={t("schemes.noMatchingDesc")}
            action={
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(""); setActiveTab("all"); }}>
                {t("schemes.resetFilters")}
              </Button>
            }
          />
        ) : (
          filteredSchemes.map((scheme) => (
            <Card
              key={scheme.id}
              className={cn(
                "relative overflow-hidden transition-all hover:shadow-md",
                scheme.is_eligible
                  ? "border-[color-mix(in_srgb,var(--primary)_25%,var(--border))]"
                  : "opacity-80 border-[var(--border)]"
              )}
            >
              <div className="h-1 w-full bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)]" />
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Scheme Header & Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-lg text-[var(--foreground)]">{scheme.name}</span>
                      <Badge tone={scheme.badge_tone}>{scheme.status}</Badge>
                      {scheme.is_state_specific ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-[#D97706] dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
                          <Building2 className="h-3 w-3" /> {t("schemes.maharashtraState")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#C5DCF5] bg-[#EAF4FC] px-2 py-0.5 text-[11px] font-medium text-[#1D5FA7] dark:border-[#1D5FA7]/40 dark:bg-[#1D5FA7]/20 dark:text-[#5FA9E6]">
                          <Award className="h-3 w-3" /> {t("schemes.centralGovt")}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-[var(--primary)]">{scheme.authority}</p>
                    <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{scheme.description}</p>

                    {/* Criteria Met Pills */}
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-[var(--foreground)] mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" /> {t("schemes.whyQualify")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {scheme.criteria_met.map((crit, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-[#16A34A] dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium"
                          >
                            ✓ {crit}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Key Benefits */}
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-[var(--foreground)] mb-1">{t("schemes.keyBenefits")}</p>
                      <ul className="grid sm:grid-cols-2 gap-1.5 text-xs text-[var(--muted-foreground)]">
                        {scheme.benefits.slice(0, 4).map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[var(--primary)] font-bold">•</span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Right Action & Cover Box */}
                  <div className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 lg:w-72 shrink-0">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        {t("schemes.maxBenefit")}
                      </span>
                      <p className="text-xl font-bold text-[#16A34A]">{scheme.coverage_amount}</p>
                      <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] pt-1">
                        <PhoneCall className="h-3.5 w-3.5 text-[var(--primary)]" />
                        <span>{t("schemes.helpline")}: <strong>{scheme.helpline}</strong></span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
                      <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                        <FileCheck className="h-3.5 w-3.5 text-[#D97706]" />
                        {t("schemes.docs")}: {scheme.required_documents.slice(0, 2).join(", ")}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => {
                            setSelectedScheme(scheme);
                            setClaimModalOpen(true);
                          }}
                        >
                          {t("schemes.howToClaim")}
                        </Button>
                        <Button asChild size="sm" variant="outline" className="px-2">
                          <a href={scheme.portal_url} target="_blank" rel="noopener noreferrer" title={t("schemes.officialPortal")}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Claim / How to Avail Modal */}
      {selectedScheme && (
        <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge tone={selectedScheme.badge_tone}>{selectedScheme.status}</Badge>
                <span className="text-xs text-[var(--muted-foreground)]">{selectedScheme.authority}</span>
              </div>
              <DialogTitle className="mt-1">{selectedScheme.name}</DialogTitle>
              <DialogDescription>
                Cashless coverage: <strong className="text-emerald-600">{selectedScheme.coverage_amount}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-[var(--muted)]/40 p-3 space-y-2">
                <p className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[var(--primary)]" /> {t("schemes.requiredDocs")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedScheme.required_documents.map((doc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md bg-[var(--card)] border border-[var(--border)] px-2.5 py-1 text-xs font-medium"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {doc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {t("schemes.claimProcess")}
                </p>
                <div className="space-y-2">
                  {selectedScheme.application_steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--foreground)]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <p className="pt-0.5 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 text-xs">
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-[var(--primary)]" />
                  <div>
                    <p className="font-semibold">{t("schemes.tollFree")}</p>
                    <p className="text-[var(--muted-foreground)]">{selectedScheme.helpline}</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/patient/hospitals">{t("schemes.findNetwork")}</Link>
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleDownloadCertificate}>
                  <Download className="h-4 w-4" /> {t("schemes.downloadClaim")}
                </Button>
                <Button asChild variant="secondary" className="gap-1.5">
                  <a href={selectedScheme.portal_url} target="_blank" rel="noopener noreferrer">
                    {t("schemes.openPortal")} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Emergency & Network Hospitals Help Footer */}
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t("schemes.needHelp")}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("schemes.ayushmanMitra")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/patient/hospitals">{t("schemes.locateHospital")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/chat">{t("schemes.askAssistant")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
