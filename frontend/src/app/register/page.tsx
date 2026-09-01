"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/lib/api";
import { ROLE_HOME, useAuth } from "@/lib/auth";

const LOCALITIES = [
  "Shivajinagar", "Hinjewadi", "Baner", "Wakad", "Pimpri", "Chinchwad", "Hadapsar", "Katraj",
  "Warje", "Kondhwa", "Sinhagad Road", "Bhosari", "Aundh", "Yerwada", "City Center", "Wagholi",
  "Chakan", "Mulshi", "Saswad", "Khed Shivapur",
];

interface FormValues {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  locality: string;
  gender: string;
  date_of_birth: string;
}

export default function RegisterPage() {
  const { register: signUp } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: { role: "patient", locality: "Hadapsar", gender: "female" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const account = await signUp({
        ...values,
        date_of_birth: values.date_of_birth || null,
      });
      toast.success("Account created. Welcome to SevaSetu AI.");
      router.replace(ROLE_HOME[account.role]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-surface mx-auto mt-8 max-w-3xl rounded-3xl p-6 sm:p-8"
      >
        <h1 className="text-3xl font-bold tracking-tight">Create your SevaSetu account</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Patients get a digital health ID instantly. Health workers are verified by the district office.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" placeholder="Sunita Jadhav" {...register("full_name", { required: true, minLength: 2 })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile number</Label>
            <Input id="phone" placeholder="9876543210" {...register("phone", { required: true, minLength: 10 })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password", { required: true, minLength: 6 })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Register as</Label>
            <Select id="role" {...register("role")}>
              <option value="patient">Patient</option>
              <option value="asha">ASHA worker</option>
              <option value="doctor">Doctor</option>
              <option value="hospital_admin">Hospital admin</option>
              <option value="dho">District Health Officer</option>
              <option value="emergency">Emergency response</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locality">Locality</Label>
            <Select id="locality" {...register("locality")}>
              {LOCALITIES.map((locality) => (
                <option key={locality} value={locality}>
                  {locality}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender" {...register("gender")}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
          </div>

          {Object.keys(formState.errors).length > 0 ? (
            <p className="text-xs text-[var(--danger)] sm:col-span-2">
              Please complete all required fields with valid values.
            </p>
          ) : null}

          <Button type="submit" size="lg" className="sm:col-span-2" loading={submitting}>
            Create account <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
