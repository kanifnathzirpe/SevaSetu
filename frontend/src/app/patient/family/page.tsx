"use client";

import { useQuery } from "@tanstack/react-query";
import { Baby, Plus, User } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AddFamilyMemberModal } from "@/components/add-family-member-modal";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Child } from "@/lib/types";

export default function PatientFamilyPage() {
  const { data: children = [], isLoading } = useQuery({
    queryKey: ["patient", "children"],
    queryFn: () => api.get<Child[]>("/api/v1/patient/children"),
  });

  return (
    <>
      <PageHeader
        title="My Family"
        description="Manage your family members and their health records"
        actions={
          <AddFamilyMemberModal
            triggerButton={
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add Family Member
              </Button>
            }
          />
        }
      />

      {isLoading ? (
        <LoadingBlock rows={3} />
      ) : children.length === 0 ? (
        <EmptyState
          icon={User}
          title="No family members registered"
          description="Add your family members to track their health records and vaccinations"
          action={
            <AddFamilyMemberModal
              triggerButton={
                <Button size="sm">
                  <Plus className="h-4 w-4" /> Add First Family Member
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {children.map((child) => (
            <Card key={child.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Baby className="h-5 w-5 text-[var(--primary)]" />
                      <p className="font-semibold">{child.name}</p>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {child.gender} · {new Date(child.date_of_birth).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {child.locality}
                    </p>
                  </div>
                  <Badge tone={child.vaccinations_due > 0 ? "warning" : "success"}>
                    {child.vaccinations_due} pending
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-[var(--muted)] p-2">
                    <p className="font-semibold text-[var(--foreground)]">{child.birth_weight_kg} kg</p>
                    <p className="text-[var(--muted-foreground)]">Birth weight</p>
                  </div>
                  <div className="rounded-lg bg-[var(--muted)] p-2">
                    <p className="font-semibold text-[var(--foreground)]">{child.current_weight_kg} kg</p>
                    <p className="text-[var(--muted-foreground)]">Current weight</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/patient/vaccinations?child=${child.id}`}>
                      View Vaccinations
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}