"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Ambulance,
  Baby,
  Building2,
  CalendarDays,
  HeartPulse,
  Package,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react";
import Link from "next/link";

import { DonutChart, SimpleBarChart, TrendAreaChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { AdminDashboard } from "@/lib/types";
import { titleCase } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const isHospitalAdmin = user?.role === "hospital_admin";

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", user?.role],
    queryFn: () => api.get<AdminDashboard>("/api/v1/admin/dashboard"),
  });

  if (isLoading || !data) return <LoadingBlock rows={6} />;

  const { stats, hospital } = data;

  if (isHospitalAdmin) {
    const hospName = hospital?.name || "Hospital";
    return (
      <>
        <PageHeader
          title={`${hospName} · Operations`}
          description={`Hospital Inpatient & OPD Operations · ${hospital?.locality ?? "City Center"} · ${hospital?.open_24x7 ? "24x7 Emergency & Trauma" : "Public Facility"}`}
          actions={
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/inventory">Pharmacy Stock</Link>
              </Button>
              <Button asChild>
                <Link href="/admin/reports">Generate Hospital Report</Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="OPD Consultations Today"
            value={stats.appointments_today}
            hint="Scheduled consultations today"
            icon={CalendarDays}
            tone="primary"
            index={0}
          />
          <StatCard
            label="Hospital Doctors"
            value={stats.total_doctors}
            hint={`Medical officers at ${hospName.split(" ")[0]}`}
            icon={Stethoscope}
            tone="info"
            index={1}
          />
          <StatCard
            label="Inpatient Bed Capacity"
            value={stats.total_beds}
            hint={`${stats.available_beds} beds currently free`}
            icon={Building2}
            tone="success"
            index={2}
          />
          <StatCard
            label="Hospital Bed Occupancy"
            value={`${stats.bed_occupancy_percent}%`}
            hint={`${stats.total_beds - stats.available_beds} admitted inpatients`}
            icon={HeartPulse}
            tone="warning"
            index={3}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="ICU Bed Capacity"
            value={hospital?.icu_beds ?? stats.icu_beds ?? 120}
            hint={`${hospital?.available_icu_beds ?? stats.available_icu_beds ?? 38} available ICU beds`}
            icon={Activity}
            tone="danger"
            index={4}
          />
          <StatCard
            label="Ambulances Stationed"
            value={stats.total_ambulances}
            hint="Stationed at emergency trauma bay"
            icon={Ambulance}
            tone="primary"
            index={5}
          />
          <StatCard
            label="Pharmacy Inventory"
            value={stats.total_medicines ?? 48}
            hint={`${stats.low_stock_medicines ?? 0} low stock alerts`}
            icon={Package}
            tone="info"
            index={6}
          />
          <StatCard
            label="Patients Treated"
            value={stats.total_patients}
            hint="Hospital OPD & in-patient records"
            icon={Users}
            tone="success"
            index={7}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Hospital OPD & Consultation Volume</CardTitle>
              <CardDescription>Last 14 days at {hospName}</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendAreaChart
                data={data.appointment_trend}
                xKey="date"
                series={[
                  { key: "appointments", label: t("admin.booked") },
                  { key: "completed", label: t("dashboard.completed") ?? "Completed" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clinical Department Mix</CardTitle>
              <CardDescription>Doctor distribution across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={data.facility_split.map((item) => ({
                  name: item.facility_type,
                  count: item.count,
                }))}
                nameKey="name"
                valueKey="count"
                height={240}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Patient Catchment by Locality</CardTitle>
              <CardDescription>Localities of patients visiting {hospName}</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={data.patients_by_locality}
                xKey="locality"
                series={[{ key: "patients", label: t("nav.patients") }]}
                height={300}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hospital Doctors by Specialization</CardTitle>
              <CardDescription>Active medical specialists on roster at {hospName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.top_specializations.map((item) => {
                const max = Math.max(...data.top_specializations.map((row) => row.doctors), 1);
                return (
                  <div key={item.specialization}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.specialization}</span>
                      <span className="font-semibold">{item.doctors}</span>
                    </div>
                    <Progress className="mt-1.5" value={Math.round((item.doctors / max) * 100)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // DHO (District Health Officer) view
  return (
    <>
      <PageHeader
        title={t("admin.districtAnalytics")}
        description={t("admin.livePicture")}
        actions={
          <Button asChild>
            <Link href="/admin/reports">{t("admin.generateReport")}</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("admin.registeredPatients")}
          value={stats.total_patients}
          hint={`${stats.appointments_today} ${t("admin.appointmentsToday")}`}
          icon={Users}
          tone="primary"
          index={0}
        />
        <StatCard
          label={t("admin.doctors")}
          value={stats.total_doctors}
          hint={`${stats.total_asha_workers} ${t("admin.ashaWorkers")}`}
          icon={Stethoscope}
          tone="info"
          index={1}
        />
        <StatCard
          label={t("admin.facilities")}
          value={stats.total_hospitals}
          hint={`${stats.total_beds} ${t("admin.beds")} · ${stats.available_beds} ${t("admin.free")}`}
          icon={Building2}
          tone="success"
          index={2}
        />
        <StatCard
          label={t("admin.activeSos")}
          value={stats.active_sos}
          hint={`${stats.total_ambulances} ${t("admin.ambulancesInFleet")}`}
          icon={Ambulance}
          tone="danger"
          index={3}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("admin.immunisationCoverage")}
          value={`${stats.immunisation_coverage_percent}%`}
          hint={t("admin.allAntigens")}
          icon={Syringe}
          tone="success"
          index={4}
        />
        <StatCard
          label={t("admin.highRiskPregnancies")}
          value={stats.high_risk_pregnancies}
          hint={t("admin.requiresEscalation")}
          icon={Baby}
          tone="warning"
          index={5}
        />
        <StatCard
          label={t("admin.bedOccupancy")}
          value={`${stats.bed_occupancy_percent}%`}
          hint={t("admin.districtWide")}
          icon={HeartPulse}
          tone="info"
          index={6}
        />
        <StatCard
          label={t("admin.ashaVisitsMonth")}
          value={stats.visits_this_month}
          hint={`${stats.open_referrals} ${t("admin.openReferrals")}`}
          icon={Users}
          tone="primary"
          index={7}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("admin.appointmentVolume")}</CardTitle>
            <CardDescription>{t("admin.last14Days")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart
              data={data.appointment_trend}
              xKey="date"
              series={[
                { key: "appointments", label: t("admin.booked") },
                { key: "completed", label: t("dashboard.completed") ?? "Completed" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.facilityMix")}</CardTitle>
            <CardDescription>{t("admin.publicHealthInfra")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={data.facility_split.map((item) => ({
                name: titleCase(item.facility_type),
                count: item.count,
              }))}
              nameKey="name"
              valueKey="count"
              height={240}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.patientsByLocality")}</CardTitle>
            <CardDescription>{t("admin.topLocalities")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={data.patients_by_locality}
              xKey="locality"
              series={[{ key: "patients", label: t("nav.patients") }]}
              height={300}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.specialisationStrength")}</CardTitle>
            <CardDescription>{t("admin.doctorsAvailable")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_specializations.map((item) => {
              const max = Math.max(...data.top_specializations.map((row) => row.doctors), 1);
              return (
                <div key={item.specialization}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.specialization}</span>
                    <span className="font-semibold">{item.doctors}</span>
                  </div>
                  <Progress className="mt-1.5" value={Math.round((item.doctors / max) * 100)} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
