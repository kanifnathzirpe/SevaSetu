"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, CloudUpload, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Household, Visit } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

const PURPOSES = [
  "Routine household check",
  "ANC follow-up",
  "Immunisation reminder",
  "Postnatal care",
  "TB medication adherence",
  "Fever surveillance",
  "Nutrition counselling",
];

export default function VisitPlannerPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = React.useState({
    household_id: 0,
    visit_date: new Date().toISOString().slice(0, 10),
    purpose: PURPOSES[0],
    notes: "",
    bp_systolic: "",
    bp_diastolic: "",
    temperature_c: "",
    weight_kg: "",
    medicines_given: "",
  });

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["asha", "visits", date],
    queryFn: () => api.get<Visit[]>(`/api/v1/asha/visits?on=${date}`),
  });

  const { data: households = [] } = useQuery({
    queryKey: ["asha", "households", "", ""],
    queryFn: () => api.get<Household[]>("/api/v1/asha/households"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["asha"] });

  const create = useMutation({
    mutationFn: () =>
      api.post<Visit>("/api/v1/asha/visits", {
        household_id: Number(form.household_id),
        visit_date: form.visit_date,
        purpose: form.purpose,
        notes: form.notes,
        bp_systolic: form.bp_systolic ? Number(form.bp_systolic) : null,
        bp_diastolic: form.bp_diastolic ? Number(form.bp_diastolic) : null,
        temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        medicines_given: form.medicines_given,
        status: "planned",
      }),
    onSuccess: () => {
      toast.success("Visit planned");
      invalidate();
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const complete = useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/asha/visits/${id}/complete`),
    onSuccess: () => {
      toast.success("Visit completed");
      invalidate();
    },
  });

  const sync = useMutation({
    mutationFn: () => api.post<{ message: string }>("/api/v1/asha/sync"),
    onSuccess: (response) => {
      toast.success(response.message);
      invalidate();
    },
  });

  const pending = visits.filter((visit) => !visit.synced).length;

  return (
    <>
      <PageHeader
        title="Visit planner"
        description="Plan, record and sync household visits — works offline in low-network villages"
        actions={
          <>
            <Button variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}>
              <CloudUpload className="h-4 w-4" /> Sync ({pending})
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Plan visit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Plan a household visit</DialogTitle>
                  <DialogDescription>Vitals recorded during the visit sync to the district server.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Household</Label>
                    <Select value={form.household_id} onChange={(event) => setForm({ ...form, household_id: Number(event.target.value) })}>
                      <option value={0}>Select a household</option>
                      {households.map((household) => (
                        <option key={household.id} value={household.id}>
                          {household.head_name} — {household.household_code}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Visit date</Label>
                    <Input type="date" value={form.visit_date} onChange={(event) => setForm({ ...form, visit_date: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Purpose</Label>
                    <Select value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })}>
                      {PURPOSES.map((purpose) => (
                        <option key={purpose} value={purpose}>
                          {purpose}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>BP systolic</Label>
                    <Input type="number" value={form.bp_systolic} onChange={(event) => setForm({ ...form, bp_systolic: event.target.value })} placeholder="120" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>BP diastolic</Label>
                    <Input type="number" value={form.bp_diastolic} onChange={(event) => setForm({ ...form, bp_diastolic: event.target.value })} placeholder="80" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Temperature (°C)</Label>
                    <Input type="number" step="0.1" value={form.temperature_c} onChange={(event) => setForm({ ...form, temperature_c: event.target.value })} placeholder="37.0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Weight (kg)</Label>
                    <Input type="number" step="0.1" value={form.weight_kg} onChange={(event) => setForm({ ...form, weight_kg: event.target.value })} placeholder="58" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Medicines distributed</Label>
                    <Input value={form.medicines_given} onChange={(event) => setForm({ ...form, medicines_given: event.target.value })} placeholder="IFA tablets x30, ORS x2" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                  </div>
                </div>
                <Button className="mt-6 w-full" disabled={!form.household_id} loading={create.isPending} onClick={() => create.mutate()}>
                  Save visit
                </Button>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Showing visits for</Label>
          <Input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-48" />
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : visits.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No visits on this date" description="Plan a visit to add it to your route." />
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Card key={visit.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold">{visit.household_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {visit.locality} · {visit.purpose} · {formatDate(visit.visit_date)}
                  </p>
                  <p className="mt-1 text-xs">
                    {visit.bp_systolic ? `BP ${visit.bp_systolic}/${visit.bp_diastolic} · ` : ""}
                    {visit.temperature_c ? `${visit.temperature_c}°C · ` : ""}
                    {visit.weight_kg ? `${visit.weight_kg} kg` : ""}
                  </p>
                  {visit.medicines_given ? (
                    <p className="mt-1 text-xs text-[var(--primary)]">Given: {visit.medicines_given}</p>
                  ) : null}
                  {visit.notes ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{visit.notes}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  {!visit.synced ? <Badge tone="warning">Pending sync</Badge> : <Badge tone="success">Synced</Badge>}
                  <Badge tone={visit.status === "completed" ? "success" : visit.status === "missed" ? "danger" : "primary"}>
                    {titleCase(visit.status)}
                  </Badge>
                  {visit.status !== "completed" ? (
                    <Button size="sm" variant="outline" onClick={() => complete.mutate(visit.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
