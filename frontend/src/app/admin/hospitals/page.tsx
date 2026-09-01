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
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<Hospital | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "hospitals", search],
    queryFn: () => api.get<Hospital[]>(`/api/v1/admin/hospitals${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });

  const markers: MapMarker[] = data.map((hospital) => ({
    id: hospital.id,
    lat: hospital.latitude,
    lng: hospital.longitude,
    title: hospital.name,
    subtitle: `${titleCase(hospital.facility_type)} · ${hospital.available_beds}/${hospital.total_beds} beds free`,
    kind: hospital.facility_type === "phc" || hospital.facility_type === "sub_center" ? "phc" : "hospital",
  }));

  return (
    <>
      <PageHeader
        title="Hospital management"
        description="Government facilities, bed capacity and live occupancy across the district"
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search facilities" className="pl-9" />
          </div>
        }
      />

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
