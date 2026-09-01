"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ambulance as AmbulanceIcon, Phone, Siren, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { MapView, type MapMarker } from "@/components/map";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Ambulance, Hospital, Sos } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

interface ConsolePayload {
  stats: {
    active_cases: number;
    ambulances_total: number;
    ambulances_available: number;
    ambulances_on_duty: number;
    critical_cases: number;
  };
  active_sos: Sos[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
}

export default function EmergencyConsolePage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const NEXT_STATUS: Record<string, { label: string; value: string }> = {
    requested: { label: t("emergency.dispatchAmbulance"), value: "dispatched" },
    dispatched: { label: t("emergency.markEnRoute"), value: "en_route" },
    en_route: { label: t("emergency.markArrived"), value: "arrived" },
    arrived: { label: t("emergency.closeCase"), value: "completed" },
  };

  const { data, isLoading } = useQuery({
    queryKey: ["emergency", "console"],
    queryFn: () => api.get<ConsolePayload>("/api/v1/emergency/console"),
    refetchInterval: 15_000,
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch<Sos>(`/api/v1/emergency/sos/${id}/status`, { status }),
    onSuccess: (sos) => {
      toast.success(`Case #${sos.id} updated to ${titleCase(sos.status)}`);
      queryClient.invalidateQueries({ queryKey: ["emergency"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !data) return <LoadingBlock rows={6} />;

  const markers: MapMarker[] = [
    ...data.active_sos.map((sos) => ({
      id: `sos-${sos.id}`,
      lat: sos.latitude,
      lng: sos.longitude,
      title: `SOS #${sos.id} · ${sos.emergency_type}`,
      subtitle: `${sos.address} · ${titleCase(sos.status)}`,
      kind: "sos" as const,
    })),
    ...data.ambulances.map((ambulance) => ({
      id: `amb-${ambulance.id}`,
      lat: ambulance.latitude,
      lng: ambulance.longitude,
      title: ambulance.vehicle_number,
      subtitle: `${titleCase(ambulance.status)} · ${ambulance.driver_name}`,
      kind: "ambulance" as const,
    })),
    ...data.hospitals.map((hospital) => ({
      id: `hosp-${hospital.id}`,
      lat: hospital.latitude,
      lng: hospital.longitude,
      title: hospital.name,
      subtitle: `Emergency · ${hospital.available_beds} beds free`,
      kind: "hospital" as const,
    })),
  ];

  return (
    <>
      <PageHeader
        title={t("emergency.controlRoom")}
        description={t("emergency.dispatchConsole")}
        actions={
          <Button asChild variant="outline">
            <Link href="/emergency/cases">{t("emergency.caseHistory")}</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("emergency.activeCases")} value={data.stats.active_cases} hint={`${data.stats.critical_cases} ${t("emergency.critical")}`} icon={Siren} tone="danger" index={0} />
        <StatCard label={t("emergency.ambulancesAvailable")} value={data.stats.ambulances_available} hint={`${data.stats.ambulances_total} ${t("emergency.inFleet")}`} icon={AmbulanceIcon} tone="success" index={1} />
        <StatCard label={t("emergency.onDuty")} value={data.stats.ambulances_on_duty} hint={t("emergency.currentlyDeployed")} icon={AmbulanceIcon} tone="warning" index={2} />
        <StatCard label={t("emergency.receivingCentres")} value={data.hospitals.length} hint={t("emergency.emergencyCapable")} icon={TriangleAlert} tone="info" index={3} />
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardContent className="p-0">
          <MapView markers={markers} className="h-[400px] w-full" />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("emergency.activeSosQueue")}</CardTitle>
          <CardDescription>{t("emergency.autoRefreshing")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.active_sos.length === 0 ? (
            <EmptyState icon={Siren} title={t("emergency.noActiveEmergencies")} description={t("emergency.allCasesResolved")} />
          ) : (
            data.active_sos.map((sos) => {
              const next = NEXT_STATUS[sos.status];
              return (
                <div key={sos.id} className="rounded-xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        #{sos.id} · {sos.emergency_type}
                        <Badge className="ml-2" tone={sos.status === "requested" ? "danger" : "warning"}>
                          {titleCase(sos.status)}
                        </Badge>
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)]">{sos.patient_name || t("emergency.unregisteredCaller")} · {sos.address}</p>
                      <p className="mt-1 text-sm">{sos.description}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {t("emergency.raised")} {formatDate(sos.created_at, true)}
                        {sos.ambulance_number ? ` · ${sos.ambulance_number} (${sos.ambulance_driver})` : ` · ${t("emergency.noAmbulanceAssigned")}`}
                        {sos.eta_minutes ? ` · ${t("emergency.eta")} ${sos.eta_minutes} ${t("emergency.min")}` : ""}
                        {sos.hospital_name ? ` · ${sos.hospital_name}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sos.ambulance_phone ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`tel:${sos.ambulance_phone}`}>
                            <Phone className="h-3.5 w-3.5" /> {t("emergency.callDriver")}
                          </a>
                        </Button>
                      ) : null}
                      {next ? (
                        <Button size="sm" loading={advance.isPending} onClick={() => advance.mutate({ id: sos.id, status: next.value })}>
                          {next.label}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => advance.mutate({ id: sos.id, status: "cancelled" })}>
                        {t("emergency.cancel")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </>
  );
}
