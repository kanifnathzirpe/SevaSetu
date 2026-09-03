"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, HeartPulse, ShieldCheck } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { HealthCard } from "@/lib/types";
import { downloadTextFile, formatDate, titleCase } from "@/lib/utils";

function QrCode({ value }: { value: string }) {
  const size = 21;
  const cells = React.useMemo(() => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    const grid: boolean[] = [];
    let state = hash || 1;
    for (let index = 0; index < size * size; index += 1) {
      state = (state * 1103515245 + 12345) >>> 0;
      grid.push(((state >> 16) & 1) === 1);
    }
    const finder = (row: number, col: number) =>
      (row < 7 && col < 7) || (row < 7 && col >= size - 7) || (row >= size - 7 && col < 7);
    return grid.map((filled, index) => {
      const row = Math.floor(index / size);
      const col = index % size;
      if (finder(row, col)) {
        const localRow = row < 7 ? row : row - (size - 7);
        const localCol = col < 7 ? col : col - (size - 7);
        const onBorder = localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6;
        const inner = localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4;
        return onBorder || inner;
      }
      return filled;
    });
  }, [value]);

  return (
    <div
      className="grid gap-0 rounded-xl bg-white p-3"
      style={{ gridTemplateColumns: `repeat(${size}, 6px)` }}
      aria-label="Health ID QR code"
    >
      {cells.map((filled, index) => (
        <span key={index} style={{ width: 6, height: 6, background: filled ? "#0b1f24" : "#ffffff" }} />
      ))}
    </div>
  );
}

export default function HealthCardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["patient", "health-card"],
    queryFn: () => api.get<HealthCard>("/api/v1/patient/health-card"),
  });

  if (isLoading || !data) return <LoadingBlock rows={4} />;

  return (
    <>
      <PageHeader
        title="Digital health card"
        description="Show this at any government facility in Maharashtra for instant record access"
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              Print card
            </Button>
            <Button
              onClick={() => {
                downloadTextFile(
                  `sevasetu-health-card-${data.health_id}.txt`,
                  [
                    "SEVASETU — DIGITAL HEALTH CARD",
                    "Government of Maharashtra · Public Health Department",
                    "",
                    `Health ID       : ${data.health_id}`,
                    `ABHA number     : ${data.abha_number ?? "Not linked"}`,
                    `Name            : ${data.full_name}`,
                    `Age / Gender    : ${data.age} / ${titleCase(data.gender)}`,
                    `Blood group     : ${data.blood_group}`,
                    `Locality        : ${data.locality}, ${data.district}, ${data.state}`,
                    `Emergency       : ${data.emergency_contact.name} (${data.emergency_contact.phone})`,
                    `Allergies       : ${data.allergies.join(", ") || "None"}`,
                    `Chronic illness : ${data.chronic_conditions.join(", ") || "None"}`,
                    `Issued on       : ${data.issued_on}`,
                  ].join("\n")
                );
                toast.success("Health card downloaded");
              }}
            >
              <Download className="h-4 w-4" /> Download
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary)] via-[color-mix(in_srgb,var(--primary)_65%,var(--secondary))] to-[var(--secondary)] p-7 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Government of Maharashtra</p>
                <p className="mt-1 flex items-center gap-2 text-xl font-bold">
                  <HeartPulse className="h-5 w-5" /> SevaSetu Digital Health Card
                </p>
              </div>
              <ShieldCheck className="h-8 w-8 text-white/70" />
            </div>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-3xl font-bold">{data.full_name}</p>
                <p className="mt-1 font-mono text-lg tracking-widest text-white/90">{data.health_id}</p>
                <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <p className="text-white/60">Age / Gender</p>
                    <p className="font-semibold">{data.age} · {titleCase(data.gender)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Blood group</p>
                    <p className="font-semibold">{data.blood_group}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Locality</p>
                    <p className="font-semibold">{data.locality}</p>
                  </div>
                  <div>
                    <p className="text-white/60">ABHA</p>
                    <p className="font-semibold">{data.abha_number ?? "Not linked"}</p>
                  </div>
                </div>
              </div>
              <QrCode value={data.qr_payload} />
            </div>

            <p className="mt-6 text-xs text-white/60">
              Issued {formatDate(data.issued_on)} · Valid across all public health facilities in {data.district} district
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency contact</CardTitle>
              <CardDescription>Contacted automatically when an SOS is raised</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{data.emergency_contact.name}</p>
              <a href={`tel:${data.emergency_contact.phone}`} className="text-sm text-[var(--primary)]">
                {data.emergency_contact.phone}
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Critical medical alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Allergies</p>
                <p className="font-medium">{data.allergies.join(", ") || "None recorded"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Chronic conditions</p>
                <p className="font-medium">{data.chronic_conditions.join(", ") || "None recorded"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
