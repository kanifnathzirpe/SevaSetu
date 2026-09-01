"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Baby, Syringe } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Child } from "@/lib/types";
import { formatDate, titleCase } from "@/lib/utils";

interface DueVaccination {
  id: number;
  child_id: number;
  child_name: string;
  vaccine_name: string;
  dose_label: string;
  scheduled_date: string;
  status: string;
  locality: string;
}

export default function AshaChildrenPage() {
  const queryClient = useQueryClient();

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["asha", "children"],
    queryFn: () => api.get<Child[]>("/api/v1/asha/children"),
  });

  const { data: due = [] } = useQuery({
    queryKey: ["asha", "vaccinations"],
    queryFn: () => api.get<DueVaccination[]>("/api/v1/asha/vaccinations"),
  });

  const administer = useMutation({
    mutationFn: (id: number) => api.post<{ message: string }>(`/api/v1/asha/vaccinations/${id}/administer`),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: ["asha"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader title="Child health & immunisation" description="Growth monitoring and Universal Immunisation Programme coverage in your ward" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="h-4 w-4 text-[var(--primary)]" /> Registered children ({children.length})
            </CardTitle>
            <CardDescription>Nutrition status from the last growth measurement</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingBlock rows={3} />
            ) : children.length === 0 ? (
              <EmptyState icon={Baby} title="No children registered" description="Register children during household surveys." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Name</TH>
                      <TH>Age</TH>
                      <TH>Weight</TH>
                      <TH>Nutrition</TH>
                      <TH>Due</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {children.map((child) => (
                      <TR key={child.id}>
                        <TD className="font-medium">{child.name}</TD>
                        <TD>{child.age_months} mo</TD>
                        <TD>{child.current_weight_kg} kg</TD>
                        <TD>
                          <Badge
                            tone={
                              child.nutrition_status?.toLowerCase().includes("severe")
                                ? "danger"
                                : child.nutrition_status?.toLowerCase().includes("moderate")
                                  ? "warning"
                                  : "success"
                            }
                          >
                            {titleCase(child.nutrition_status)}
                          </Badge>
                        </TD>
                        <TD>{child.vaccinations_due}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="h-4 w-4 text-[var(--warning)]" /> Immunisations due ({due.length})
            </CardTitle>
            <CardDescription>Mark doses as administered during your visit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {due.length === 0 ? (
              <EmptyState icon={Syringe} title="All caught up" description="No pending immunisations in your ward." />
            ) : (
              due.map((vaccination) => (
                <div key={vaccination.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {vaccination.child_name} · {vaccination.vaccine_name} {vaccination.dose_label}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {vaccination.locality} · due {formatDate(vaccination.scheduled_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={vaccination.status === "overdue" ? "danger" : "warning"}>{titleCase(vaccination.status)}</Badge>
                    <Button size="sm" variant="outline" onClick={() => administer.mutate(vaccination.id)}>
                      Administer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
