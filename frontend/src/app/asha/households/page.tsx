"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Home, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { MapView, type MapMarker } from "@/components/map";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import type { Household } from "@/lib/types";
import { cn, formatDate, RISK_STYLES, titleCase } from "@/lib/utils";

const WATER_SOURCES = ["Municipal tap", "Borewell", "Community well", "Tanker supply", "Hand pump"];

function SurveyDialog({ household, onClose }: { household: Household | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState({
    members_count: 4,
    has_toilet: true,
    water_source: "Municipal tap",
    risk_level: "low",
    notes: "",
  });

  React.useEffect(() => {
    if (household) {
      setForm({
        members_count: household.members_count,
        has_toilet: household.has_toilet,
        water_source: household.water_source || "Municipal tap",
        risk_level: household.risk_level,
        notes: "",
      });
    }
  }, [household]);

  const submit = useMutation({
    mutationFn: () => api.patch<Household>(`/api/v1/asha/households/${household?.id}/survey`, form),
    onSuccess: () => {
      toast.success("Survey submitted");
      queryClient.invalidateQueries({ queryKey: ["asha"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={Boolean(household)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Household survey</DialogTitle>
          <DialogDescription>
            {household?.head_name} · {household?.household_code}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Members in household</Label>
            <Input
              type="number"
              min={1}
              value={form.members_count}
              onChange={(event) => setForm({ ...form, members_count: Number(event.target.value) })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
            <div>
              <p className="text-sm font-medium">Toilet available</p>
              <p className="text-xs text-[var(--muted-foreground)]">Swachh Bharat Mission indicator</p>
            </div>
            <Switch checked={form.has_toilet} onCheckedChange={(checked) => setForm({ ...form, has_toilet: checked })} />
          </div>
          <div className="space-y-1.5">
            <Label>Drinking water source</Label>
            <Select value={form.water_source} onChange={(event) => setForm({ ...form, water_source: event.target.value })}>
              {WATER_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Risk classification</Label>
            <Select value={form.risk_level} onChange={(event) => setForm({ ...form, risk_level: event.target.value })}>
              {["low", "moderate", "high", "critical"].map((level) => (
                <option key={level} value={level}>
                  {titleCase(level)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observations</Label>
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
          <Button className="w-full" loading={submit.isPending} onClick={() => submit.mutate()}>
            Submit survey
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HouseholdsPage() {
  const [search, setSearch] = React.useState("");
  const [risk, setRisk] = React.useState("");
  const [surveying, setSurveying] = React.useState<Household | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["asha", "households", search, risk],
    queryFn: () =>
      api.get<Household[]>(
        `/api/v1/asha/households?${new URLSearchParams({ ...(search ? { search } : {}), ...(risk ? { risk } : {}) })}`
      ),
  });

  const markers: MapMarker[] = data.map((household) => ({
    id: household.id,
    lat: household.latitude,
    lng: household.longitude,
    title: household.head_name,
    subtitle: `${household.household_code} · ${household.members_count} members · ${titleCase(household.risk_level)} risk`,
    kind: "household",
  }));

  return (
    <>
      <PageHeader
        title="Assigned households"
        description="Every family registered under your sub-centre with survey and visit status"
      />

      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          <MapView markers={markers} className="h-[320px] w-full" />
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by head of family or code" className="pl-9" />
        </div>
        <Select value={risk} onChange={(event) => setRisk(event.target.value)} className="max-w-48">
          <option value="">All risk levels</option>
          {["low", "moderate", "high", "critical"].map((level) => (
            <option key={level} value={level}>
              {titleCase(level)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={Home} title="No households found" description="Adjust your filters to see assigned families." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((household) => (
            <Card key={household.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{household.head_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{household.household_code}</p>
                  </div>
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold capitalize", RISK_STYLES[household.risk_level])}>
                    {household.risk_level}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">{household.address}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-[var(--muted)] p-2">
                    <p className="font-semibold text-[var(--foreground)]">{household.members_count}</p>
                    <p className="text-[var(--muted-foreground)]">members</p>
                  </div>
                  <div className="rounded-lg bg-[var(--muted)] p-2">
                    <p className="font-semibold text-[var(--foreground)]">{household.has_toilet ? "Yes" : "No"}</p>
                    <p className="text-[var(--muted-foreground)]">toilet</p>
                  </div>
                  <div className="rounded-lg bg-[var(--muted)] p-2">
                    <p className="truncate font-semibold text-[var(--foreground)]">{household.water_source || "—"}</p>
                    <p className="text-[var(--muted-foreground)]">water</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                  Last visit: {household.last_visit_date ? formatDate(household.last_visit_date) : "never"}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSurveying(household)}>
                    <ClipboardList className="h-3.5 w-3.5" /> Survey
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={`tel:${household.phone}`}>{household.phone}</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SurveyDialog household={surveying} onClose={() => setSurveying(null)} />
    </>
  );
}
