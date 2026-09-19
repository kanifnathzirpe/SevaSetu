"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Baby, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Child, Patient } from "@/lib/types";

interface ChildForm {
  name: string;
  date_of_birth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  birth_weight_kg: string;
  current_weight_kg: string;
  height_cm: string;
  nutrition_status: string;
  locality: string;
}

export function AddFamilyMemberModal({
  triggerButton,
  onSuccess,
}: {
  triggerButton?: React.ReactNode;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  
  const [form, setForm] = React.useState<ChildForm>({
    name: "",
    date_of_birth: "",
    gender: "MALE",
    birth_weight_kg: "2.9",
    current_weight_kg: "8.0",
    height_cm: "70.0",
    nutrition_status: "Normal",
    locality: "",
  });

  const { data: patient } = useQuery({
    queryKey: ["patient", "me"],
    queryFn: () => api.get<Patient>("/api/v1/patient/me"),
    enabled: open,
  });

  // Set default locality from patient data
  React.useEffect(() => {
    if (patient && !form.locality) {
      setForm((prev) => ({ ...prev, locality: patient.locality || "" }));
    }
  }, [patient, form.locality]);

  // Default surname to patient's surname if available
  const patientSurname = user?.full_name?.split(" ").pop() || "";

  const create = useMutation({
    mutationFn: (data: ChildForm) =>
      api.post<Child>("/api/v1/patient/children", {
        ...data,
        date_of_birth: new Date(data.date_of_birth).toISOString().split("T")[0],
        birth_weight_kg: parseFloat(data.birth_weight_kg),
        current_weight_kg: parseFloat(data.current_weight_kg),
        height_cm: parseFloat(data.height_cm),
      }),
    onSuccess: () => {
      toast.success("Family member added successfully");
      queryClient.invalidateQueries({ queryKey: ["patient", "children"] });
      setOpen(false);
      setForm({
        name: "",
        date_of_birth: "",
        gender: "MALE",
        birth_weight_kg: "2.9",
        current_weight_kg: "8.0",
        height_cm: "70.0",
        nutrition_status: "Normal",
        locality: patient?.locality || "",
      });
      onSuccess?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.date_of_birth) {
      toast.error("Date of birth is required");
      return;
    }
    create.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton ?? (
          <Button>
            <Plus className="h-4 w-4" /> Add Family Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-[var(--primary)]" />
            Add Family Member
          </DialogTitle>
          <DialogDescription>
            Add a child or family member to track their health records and vaccinations
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder={patientSurname ? `e.g., Rahul ${patientSurname}` : "e.g., Rahul Jadhav"}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender</Label>
            <Select
              id="gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as "MALE" | "FEMALE" | "OTHER" })}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              required
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="birth_weight_kg">Birth Weight (kg)</Label>
              <Input
                id="birth_weight_kg"
                type="number"
                step="0.1"
                min="1"
                max="6"
                value={form.birth_weight_kg}
                onChange={(e) => setForm({ ...form, birth_weight_kg: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="current_weight_kg">Current Weight (kg)</Label>
              <Input
                id="current_weight_kg"
                type="number"
                step="0.1"
                min="1"
                max="100"
                value={form.current_weight_kg}
                onChange={(e) => setForm({ ...form, current_weight_kg: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="height_cm">Height (cm)</Label>
            <Input
              id="height_cm"
              type="number"
              step="0.1"
              min="30"
              max="200"
              value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nutrition_status">Nutrition Status</Label>
            <Select
              id="nutrition_status"
              value={form.nutrition_status}
              onChange={(e) => setForm({ ...form, nutrition_status: e.target.value })}
            >
              <option value="Normal">Normal</option>
              <option value="Moderately underweight">Moderately underweight</option>
              <option value="Severely underweight">Severely underweight</option>
              <option value="Overweight">Overweight</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="locality">Locality</Label>
            <Input
              id="locality"
              placeholder="e.g., Hadapsar"
              value={form.locality}
              onChange={(e) => setForm({ ...form, locality: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={create.isPending}>
              Add Family Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
