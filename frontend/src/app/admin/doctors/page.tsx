"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Stethoscope } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Doctor } from "@/lib/types";

export default function AdminDoctorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "doctors", search],
    queryFn: () => api.get<Doctor[]>(`/api/v1/admin/doctors${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });

  const toggle = useMutation({
    mutationFn: (id: number) => api.patch<Doctor>(`/api/v1/admin/doctors/${id}/availability`),
    onSuccess: (doctor) => {
      toast.success(`${doctor.full_name} is now ${doctor.is_available_online ? "available" : "offline"} for teleconsultation`);
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        title="Doctor management"
        description="Medical officers and specialists posted across district facilities"
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search doctors" className="pl-9" />
          </div>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No doctors found" description="Try a different search term." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Specialisation</TH>
                  <TH>Qualification</TH>
                  <TH>Facility</TH>
                  <TH>Experience</TH>
                  <TH>Fee</TH>
                  <TH>Rating</TH>
                  <TH>Teleconsult</TH>
                </TR>
              </THead>
              <TBody>
                {data.map((doctor) => (
                  <TR key={doctor.id}>
                    <TD className="font-medium">{doctor.full_name}</TD>
                    <TD>{doctor.specialization}</TD>
                    <TD>{doctor.qualification}</TD>
                    <TD>{doctor.hospital_name}</TD>
                    <TD>{doctor.experience_years} yrs</TD>
                    <TD>₹{doctor.consultation_fee}</TD>
                    <TD>
                      <Badge tone={doctor.rating >= 4.5 ? "success" : "default"}>{doctor.rating}</Badge>
                    </TD>
                    <TD>
                      <Switch checked={doctor.is_available_online} onCheckedChange={() => toggle.mutate(doctor.id)} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
