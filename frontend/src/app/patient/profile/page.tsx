"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ScoreGauge } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Patient } from "@/lib/types";

interface ProfileForm {
  height_cm: number;
  weight_kg: number;
  blood_group: string;
  address: string;
  locality: string;
  pincode: string;
  allergies: string;
  chronic_conditions: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  abha_number: string;
}

interface HealthScore {
  score: number;
  bmi: number;
  medication_adherence: number;
  abnormal_reports: number;
  breakdown: { factor: string; value: number }[];
}

export default function PatientProfilePage() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", "me"],
    queryFn: () => api.get<Patient>("/api/v1/patient/me"),
  });

  const { data: score } = useQuery({
    queryKey: ["patient", "health-score"],
    queryFn: () => api.get<HealthScore>("/api/v1/patient/health-score"),
  });

  const { register, handleSubmit, reset } = useForm<ProfileForm>();

  React.useEffect(() => {
    if (patient) {
      reset({
        height_cm: patient.height_cm,
        weight_kg: patient.weight_kg,
        blood_group: patient.blood_group,
        address: patient.address,
        locality: patient.locality,
        pincode: patient.pincode,
        allergies: patient.allergies,
        chronic_conditions: patient.chronic_conditions,
        emergency_contact_name: patient.emergency_contact_name,
        emergency_contact_phone: patient.emergency_contact_phone,
        abha_number: patient.abha_number ?? "",
      });
    }
  }, [patient, reset]);

  const save = useMutation({
    mutationFn: (values: ProfileForm) =>
      api.patch<Patient>("/api/v1/patient/me", {
        ...values,
        height_cm: Number(values.height_cm),
        weight_kg: Number(values.weight_kg),
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["patient"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveAccount = useMutation({
    mutationFn: (values: { full_name: string; phone: string }) => api.patch("/api/v1/auth/me", values),
    onSuccess: async () => {
      await refreshUser();
      toast.success("Account details updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !patient) return <LoadingBlock rows={5} />;

  return (
    <>
      <PageHeader title="Health profile" description="Keep your clinical details current so care teams can act quickly" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Clinical details</CardTitle>
            <CardDescription>Updating height, weight or conditions recalculates your health score</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((values) => save.mutate(values))} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="height_cm">Height (cm)</Label>
                <Input id="height_cm" type="number" step="0.1" {...register("height_cm")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight_kg">Weight (kg)</Label>
                <Input id="weight_kg" type="number" step="0.1" {...register("weight_kg")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blood_group">Blood group</Label>
                <Select id="blood_group" {...register("blood_group")}>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="abha_number">ABHA number</Label>
                <Input id="abha_number" placeholder="12-3456-7890-1234" {...register("abha_number")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" {...register("address")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="locality">Locality</Label>
                <Input id="locality" {...register("locality")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pincode">PIN code</Label>
                <Input id="pincode" {...register("pincode")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="allergies">Allergies (comma separated)</Label>
                <Input id="allergies" {...register("allergies")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="chronic_conditions">Chronic conditions (comma separated)</Label>
                <Input id="chronic_conditions" {...register("chronic_conditions")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergency_contact_name">Emergency contact name</Label>
                <Input id="emergency_contact_name" {...register("emergency_contact_name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergency_contact_phone">Emergency contact phone</Label>
                <Input id="emergency_contact_phone" {...register("emergency_contact_phone")} />
              </div>
              <Button type="submit" className="sm:col-span-2" loading={save.isPending}>
                <Save className="h-4 w-4" /> Save profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health score</CardTitle>
              <CardDescription>Recalculated from your latest records</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreGauge value={score?.score ?? patient.health_score} />
              <div className="mt-2 space-y-2 text-sm">
                {(score?.breakdown ?? []).map((item) => (
                  <div key={item.factor} className="flex justify-between gap-3">
                    <span className="text-[var(--muted-foreground)]">{item.factor}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  saveAccount.mutate({
                    full_name: String(form.get("full_name")),
                    phone: String(form.get("phone")),
                  });
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" name="full_name" defaultValue={user?.full_name} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={user?.phone} />
                </div>
                <Button type="submit" variant="outline" className="w-full" loading={saveAccount.isPending}>
                  Update account
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
