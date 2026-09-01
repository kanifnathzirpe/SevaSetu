"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Baby, CheckCircle2, Syringe } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { Child, Vaccination } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

function VaccinationRow({ vaccination, onComplete }: { vaccination: Vaccination; onComplete?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
      <div>
        <p className="font-semibold">
          {vaccination.vaccine_name} · {vaccination.dose_label}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {vaccination.center_name} · scheduled {formatDate(vaccination.scheduled_date)}
          {vaccination.administered_date ? ` · given ${formatDate(vaccination.administered_date)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          tone={
            vaccination.status === "completed"
              ? "success"
              : vaccination.status === "overdue"
                ? "danger"
                : vaccination.status === "skipped"
                  ? "default"
                  : "warning"
          }
        >
          {titleCase(vaccination.status)}
        </Badge>
        {vaccination.status !== "completed" && onComplete ? (
          <Button size="sm" variant="outline" onClick={onComplete}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark done
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ChildImmunisation({ child }: { child: Child }) {
  const { data = [] } = useQuery({
    queryKey: ["patient", "child", child.id, "immunisation"],
    queryFn: () => api.get<Vaccination[]>(`/api/v1/patient/children/${child.id}/immunisation`),
  });

  const completed = data.filter((item) => item.status === "completed").length;
  const coverage = data.length ? Math.round((completed / data.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Baby className="h-4 w-4 text-[var(--primary)]" /> {child.name}
        </CardTitle>
        <CardDescription>
          {child.age_months} months · {titleCase(child.gender)} · {child.current_weight_kg} kg · {child.nutrition_status}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Progress value={coverage} className="flex-1" />
          <span className="text-xs font-semibold">{coverage}% covered</span>
        </div>
        {data.map((vaccination) => (
          <VaccinationRow key={vaccination.id} vaccination={vaccination} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function VaccinationsPage() {
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["patient", "vaccinations"],
    queryFn: () => api.get<Vaccination[]>("/api/v1/patient/vaccinations"),
  });

  const { data: children = [] } = useQuery({
    queryKey: ["patient", "children"],
    queryFn: () => api.get<Child[]>("/api/v1/patient/children"),
  });

  const complete = useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/patient/vaccinations/${id}/complete`),
    onSuccess: () => {
      toast.success("Vaccination recorded");
      queryClient.invalidateQueries({ queryKey: ["patient"] });
    },
  });

  const completed = data.filter((item) => item.status === "completed").length;
  const coverage = data.length ? Math.round((completed / data.length) * 100) : 0;

  return (
    <>
      <PageHeader title="Vaccination tracker" description="Universal Immunisation Programme records for you and your children" />

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">
            <Syringe className="h-4 w-4" /> My vaccinations ({data.length})
          </TabsTrigger>
          <TabsTrigger value="children">
            <Baby className="h-4 w-4" /> Children ({children.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-3">
          {isLoading ? (
            <LoadingBlock />
          ) : data.length === 0 ? (
            <EmptyState icon={Syringe} title="No vaccination records" description="Records added by ASHA workers appear here." />
          ) : (
            <>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <Progress value={coverage} className="flex-1" />
                  <span className="text-sm font-semibold">{coverage}% complete</span>
                </CardContent>
              </Card>
              {data.map((vaccination) => (
                <VaccinationRow
                  key={vaccination.id}
                  vaccination={vaccination}
                  onComplete={() => complete.mutate(vaccination.id)}
                />
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="children" className="space-y-4">
          {children.length === 0 ? (
            <EmptyState icon={Baby} title="No children registered" description="Children registered with your ASHA worker appear here." />
          ) : (
            children.map((child) => <ChildImmunisation key={child.id} child={child} />)
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
