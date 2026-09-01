"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Plus, Sparkles, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import type { MedicineReminder } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface Suggestion {
  medicine_name: string;
  dosage: string;
  times_of_day: string;
  reason: string;
}

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ medicine_name: "", dosage: "1 tablet", times_of_day: "08:00, 20:00" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["patient", "reminders"],
    queryFn: () => api.get<MedicineReminder[]>("/api/v1/patient/reminders"),
  });

  const { data: suggestions } = useQuery({
    queryKey: ["ai", "reminder-suggestions"],
    queryFn: () => api.get<{ suggestions: Suggestion[] }>("/api/v1/ai/medicine-reminders/suggest"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["patient", "reminders"] });
    queryClient.invalidateQueries({ queryKey: ["patient", "dashboard"] });
  };

  const create = useMutation({
    mutationFn: (payload: typeof form) => api.post<MedicineReminder>("/api/v1/patient/reminders", payload),
    onSuccess: () => {
      toast.success("Reminder created");
      invalidate();
      setOpen(false);
      setForm({ medicine_name: "", dosage: "1 tablet", times_of_day: "08:00, 20:00" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/patient/reminders/${id}/toggle`),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/patient/reminders/${id}`),
    onSuccess: () => {
      toast.success("Reminder deleted");
      invalidate();
    },
  });

  return (
    <>
      <PageHeader
        title="Medicine reminders"
        description="Never miss a dose — adherence is shared with your medical officer"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New medicine reminder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Medicine name</Label>
                  <Input
                    value={form.medicine_name}
                    onChange={(event) => setForm({ ...form, medicine_name: event.target.value })}
                    placeholder="Metformin 500mg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Dosage</Label>
                  <Input value={form.dosage} onChange={(event) => setForm({ ...form, dosage: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Times of day</Label>
                  <Input
                    value={form.times_of_day}
                    onChange={(event) => setForm({ ...form, times_of_day: event.target.value })}
                    placeholder="08:00, 14:00, 20:00"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!form.medicine_name.trim()}
                  loading={create.isPending}
                  onClick={() => create.mutate(form)}
                >
                  Create reminder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {isLoading ? (
            <LoadingBlock />
          ) : data.length === 0 ? (
            <EmptyState icon={Bell} title="No reminders yet" description="Add your daily medicines to get reminders." />
          ) : (
            data.map((reminder) => (
              <Card key={reminder.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-56 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{reminder.medicine_name}</p>
                      <Badge tone={reminder.is_active ? "success" : "default"}>
                        {reminder.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {reminder.dosage} · {reminder.times_of_day} · from {formatDate(reminder.start_date)}
                      {reminder.end_date ? ` to ${formatDate(reminder.end_date)}` : ""}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={reminder.adherence_percent} className="flex-1" />
                      <span className="text-xs font-semibold">{reminder.adherence_percent}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={reminder.is_active} onCheckedChange={() => toggle.mutate(reminder.id)} />
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(reminder.id)} aria-label="Delete reminder">
                      <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--primary)]" /> AI suggestions
            </CardTitle>
            <CardDescription>Generated from your active prescriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(suggestions?.suggestions ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No new suggestions right now.</p>
            ) : (
              suggestions?.suggestions.map((suggestion) => (
                <div key={`${suggestion.medicine_name}-${suggestion.times_of_day}`} className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-sm font-semibold">{suggestion.medicine_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {suggestion.dosage} · {suggestion.times_of_day}
                  </p>
                  <p className="mt-1 text-xs">{suggestion.reason}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() =>
                      create.mutate({
                        medicine_name: suggestion.medicine_name,
                        dosage: suggestion.dosage,
                        times_of_day: suggestion.times_of_day,
                      })
                    }
                  >
                    Add reminder
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
