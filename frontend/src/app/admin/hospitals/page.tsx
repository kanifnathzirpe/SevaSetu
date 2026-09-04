"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Building2, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { MapView, type MapMarker } from "@/components/map";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Hospital } from "@/lib/types";
import { titleCase } from "@/lib/utils";

function BedDialog({ hospital, onClose }: { hospital: Hospital | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [beds, setBeds] = React.useState(0);
  const [icu, setIcu] = React.useState(0);

  React.useEffect(() => {
    if (hospital) {
      setBeds(hospital.available_beds);
      setIcu(hospital.available_icu_beds);
    }
  }, [hospital]);

  const save = useMutation({
    mutationFn: () =>
      api.patch<Hospital>(
        `/api/v1/admin/hospitals/${hospital?.id}/beds?available_beds=${beds}&available_icu_beds=${icu}`
      ),
    onSuccess: () => {
      toast.success("Bed availability updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "hospitals"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={Boolean(hospital)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update bed availability</DialogTitle>
          <DialogDescription>
            {hospital?.name} · {hospital?.total_beds} beds · {hospital?.icu_beds} ICU
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Available beds</Label>
            <Input type="number" value={beds} onChange={(event) => setBeds(Number(event.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Available ICU beds</Label>
            <Input type="number" value={icu} onChange={(event) => setIcu(Number(event.target.value))} />
          </div>
        </div>
        <Button className="mt-6 w-full" loading={save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminHospitalsPage() {
  const { user } = useAuth();
  const isHospitalAdmin = user?.role === "hospital_admin";
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<Hospital | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "hospitals", search],
    queryFn: () => api.get<Hospital[]>(`/api/v1/admin/hospitals${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });

  const myHospital = isHospitalAdmin
    ? data.find((h) => h.locality === user?.locality) ?? data[0]
    : null;

  const markers: MapMarker[] = data.map((hospital) => ({
    id: hospital.id,
    lat: hospital.latitude,
    lng: hospital.longitude,
    title: hospital.name,
    subtitle: `${titleCase(hospital.facility_type)} · ${hospital.available_beds}/${hospital.total_beds} beds free`,
    kind: hospital.facility_type === "phc" || hospital.facility_type === "sub_center" ? "phc" : "hospital",
  }));

  const pageTitle = isHospitalAdmin
    ? `${myHospital?.name ?? "Hospital"} · Beds & Wards`
    : "District Hospital Management";
  const pageDesc = isHospitalAdmin
    ? `Live bed management, ICU availability, and district referral facilities`
    : `Government facilities, bed capacity and live occupancy across Pune District`;

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDesc}
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search facilities" className="pl-9" />
          </div>
        }
      />

      {isHospitalAdmin && myHospital && !search && (
        <Card className="mb-4 border-2 border-[var(--primary)] bg-gradient-to-r from-[color-mix(in_srgb,var(--primary)_8%,transparent)] to-transparent">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge tone="primary" className="mb-1.5">My Assigned Hospital</Badge>
                <h2 className="text-xl font-bold">{myHospital.name}</h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {titleCase(myHospital.facility_type)} · {myHospital.locality} · {myHospital.address}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  📞 {myHospital.phone} {myHospital.services ? `· Services: ${myHospital.services}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {myHospital.has_emergency && <Badge tone="danger">Emergency Bay 24×7</Badge>}
                {myHospital.has_blood_bank && <Badge tone="info">Blood Bank</Badge>}
                <Button size="sm" onClick={() => setEditing(myHospital)}>
                  <BedDouble className="h-4 w-4" /> Update My Hospital Beds
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">General Beds</p>
                <p className="text-lg font-bold text-[var(--primary)]">{myHospital.available_beds} / {myHospital.total_beds}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Available / Total</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">ICU Beds</p>
                <p className="text-lg font-bold text-red-500">{myHospital.available_icu_beds} / {myHospital.icu_beds}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Available / Total</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">Occupancy Rate</p>
                <p className="text-lg font-bold text-amber-500">
                  {myHospital.total_beds ? Math.round(((myHospital.total_beds - myHospital.available_beds) / myHospital.total_beds) * 100) : 0}%
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Inpatient capacity</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">Rating</p>
                <p className="text-lg font-bold text-emerald-500">★ {myHospital.rating}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Public rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          <MapView markers={markers} className="h-[340px] w-full" />
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={Building2} title="No facilities found" description="Try a different search." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((hospital) => {
            const occupancy = hospital.total_beds
              ? Math.round(((hospital.total_beds - hospital.available_beds) / hospital.total_beds) * 100)
              : 0;
            return (
              <Card key={hospital.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{hospital.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {titleCase(hospital.facility_type)} · {hospital.locality}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {hospital.has_emergency ? <Badge tone="danger">Emergency</Badge> : null}
                      {hospital.open_24x7 ? <Badge tone="success">24×7</Badge> : null}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">{hospital.address}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={occupancy} className="flex-1" />
                    <span className="text-xs font-semibold">{occupancy}% occupied</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-[var(--muted)] p-2">
                      <p className="font-semibold text-[var(--foreground)]">{hospital.available_beds}/{hospital.total_beds}</p>
                      <p className="text-[var(--muted-foreground)]">beds</p>
                    </div>
                    <div className="rounded-lg bg-[var(--muted)] p-2">
                      <p className="font-semibold text-[var(--foreground)]">{hospital.available_icu_beds}/{hospital.icu_beds}</p>
                      <p className="text-[var(--muted-foreground)]">ICU</p>
                    </div>
                    <div className="rounded-lg bg-[var(--muted)] p-2">
                      <p className="font-semibold text-[var(--foreground)]">{hospital.rating}</p>
                      <p className="text-[var(--muted-foreground)]">rating</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="mt-4 w-full" onClick={() => setEditing(hospital)}>
                    <BedDouble className="h-3.5 w-3.5" /> Update beds
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BedDialog hospital={editing} onClose={() => setEditing(null)} />
    </>
  );
}
