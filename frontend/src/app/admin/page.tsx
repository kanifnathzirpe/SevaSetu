"use client";

import { useQuery } from "@tanstack/react-query";
import { Ambulance, Baby, Building2, HeartPulse, Stethoscope, Syringe, Users } from "lucide-react";
import Link from "next/link";

import { DonutChart, SimpleBarChart, TrendAreaChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { AdminDashboard } from "@/lib/types";
import { titleCase } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => api.get<AdminDashboard>("/api/v1/admin/dashboard"),
  });

  if (isLoading || !data) return <LoadingBlock rows={6} />;

  const { stats } = data;

  return (
    <>
      <PageHeader
        title="District health analytics"
        description="Live operational picture of public healthcare delivery across Pune district"
        actions={
          <Button asChild>
            <Link href="/admin/reports">Generate district report</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered patients" value={stats.total_patients} hint={`${stats.appointments_today} appointments today`} icon={Users} tone="primary" index={0} />
        <StatCard label="Doctors" value={stats.total_doctors} hint={`${stats.total_asha_workers} ASHA workers`} icon={Stethoscope} tone="info" index={1} />
        <StatCard label="Facilities" value={stats.total_hospitals} hint={`${stats.total_beds} beds · ${stats.available_beds} free`} icon={Building2} tone="success" index={2} />
        <StatCard label="Active SOS" value={stats.active_sos} hint={`${stats.total_ambulances} ambulances in fleet`} icon={Ambulance} tone="danger" index={3} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Immunisation coverage" value={`${stats.immunisation_coverage_percent}%`} hint="All antigens" icon={Syringe} tone="success" index={4} />
        <StatCard label="High-risk pregnancies" value={stats.high_risk_pregnancies} hint="Requires escalation" icon={Baby} tone="warning" index={5} />
        <StatCard label="Bed occupancy" value={`${stats.bed_occupancy_percent}%`} hint="District wide" icon={HeartPulse} tone="info" index={6} />
        <StatCard label="ASHA visits this month" value={stats.visits_this_month} hint={`${stats.open_referrals} open referrals`} icon={Users} tone="primary" index={7} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Appointment volume</CardTitle>
            <CardDescription>Last 14 days across all facilities</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendAreaChart
              data={data.appointment_trend}
              xKey="date"
              series={[
                { key: "appointments", label: "Booked" },
                { key: "completed", label: "Completed" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facility mix</CardTitle>
            <CardDescription>Public health infrastructure</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={data.facility_split.map((item) => ({ name: titleCase(item.facility_type), count: item.count }))}
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
            <CardTitle>Patients by locality</CardTitle>
            <CardDescription>Top 12 localities by registration</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={data.patients_by_locality} xKey="locality" series={[{ key: "patients", label: "Patients" }]} height={300} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specialisation strength</CardTitle>
            <CardDescription>Doctors available per specialisation</CardDescription>
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
