"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Baby, Stethoscope } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
import type { Pregnancy } from "@/lib/types";
import { cn, formatDate, RISK_STYLES } from "@/lib/utils";

function AncDialog({ record, onClose }: { record: Pregnancy | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState({ hemoglobin: 11, bp_systolic: 118, bp_diastolic: 78, weight_kg: 56 });

  React.useEffect(() => {
    if (record) {
      setForm({
        hemoglobin: record.hemoglobin,
        bp_systolic: record.bp_systolic,
        bp_diastolic: record.bp_diastolic,
        weight_kg: record.weight_kg,
      });
    }
  }, [record]);

  const submit = useMutation({
    mutationFn: () =>
      api.post<Pregnancy>(
        `/api/v1/asha/pregnancies/${record?.id}/anc?${new URLSearchParams({
          hemoglobin: String(form.hemoglobin),
          bp_systolic: String(form.bp_systolic),
          bp_diastolic: String(form.bp_diastolic),
          weight_kg: String(form.weight_kg),
        })}`
      ),
    onSuccess: (updated) => {
      toast.success(`ANC recorded · risk now ${updated.risk_level}`);
      queryClient.invalidateQueries({ queryKey: ["asha"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record ANC visit</DialogTitle>
          <DialogDescription>
            {record?.patient_name} · week {record?.gestation_weeks} · visit {(record?.anc_visits_completed ?? 0) + 1} of 4
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Haemoglobin (g/dL)</Label>
            <Input type="number" step="0.1" value={form.hemoglobin} onChange={(event) => setForm({ ...form, hemoglobin: Number(event.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Weight (kg)</Label>
            <Input type="number" step="0.1" value={form.weight_kg} onChange={(event) => setForm({ ...form, weight_kg: Number(event.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>BP systolic</Label>
            <Input type="number" value={form.bp_systolic} onChange={(event) => setForm({ ...form, bp_systolic: Number(event.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>BP diastolic</Label>
            <Input type="number" value={form.bp_diastolic} onChange={(event) => setForm({ ...form, bp_diastolic: Number(event.target.value) })} />
          </div>
        </div>
        <Button className="mt-6 w-full" loading={submit.isPending} onClick={() => submit.mutate()}>
          Save ANC visit
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function AshaPregnanciesPage() {
  const [active, setActive] = React.useState<Pregnancy | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["asha", "pregnancies"],
    queryFn: () => api.get<Pregnancy[]>("/api/v1/asha/pregnancies"),
  });

  return (
    <>
      <PageHeader
        title="Pregnancy monitoring"
        description="Antenatal care tracking under Janani Suraksha Yojana for your ward"
      />

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={Baby} title="No pregnancies registered" description="Register pregnancies during household visits." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{record.patient_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      G{record.gravida}P{record.parity} · EDD {formatDate(record.edd_date)}
                    </p>
                  </div>
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold capitalize", RISK_STYLES[record.risk_level])}>
                    {record.risk_level}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <Progress value={Math.min(100, Math.round((record.gestation_weeks / 40) * 100))} className="flex-1" />
                  <span className="text-xs font-semibold">week {record.gestation_weeks}</span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-[var(--muted)] p-2">
                    <p className="font-semibold text-[var(--foreground)]">{record.hemoglobin}</p>
                    <p className="text-[var(--muted-foreground)]">Hb</p>
                  </div>
                  <div className="rounded-lg bg-[var(--muted)] p-2">
                    <p className="font-semibold text-[var(--foreground)]">{record.bp_systolic}/{record.bp_diastolic}</p>
                    <p className="text-[var(--muted-foreground)]">BP</p>
                  </div>
                  <div className="rounded-lg bg-[var(--muted)] p-2">
                    <p className="font-semibold text-[var(--foreground)]">{record.weight_kg}</p>
                    <p className="text-[var(--muted-foreground)]">kg</p>
                  </div>
                  <div className="rounded-lg bg-[var(--muted)] p-2">
                    <p className="font-semibold text-[var(--foreground)]">{record.anc_visits_completed}/4</p>
                    <p className="text-[var(--muted-foreground)]">ANC</p>
                  </div>
                </div>

                {record.notes ? <p className="mt-3 text-xs text-[var(--warning)]">{record.notes}</p> : null}
                {record.delivered ? <Badge tone="success" className="mt-3">Delivered</Badge> : null}

                <Button size="sm" variant="outline" className="mt-4" onClick={() => setActive(record)}>
                  <Stethoscope className="h-3.5 w-3.5" /> Record ANC visit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AncDialog record={active} onClose={() => setActive(null)} />
    </>
  );
}
