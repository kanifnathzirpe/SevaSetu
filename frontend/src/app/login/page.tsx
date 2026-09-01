"use client";

import { motion } from "framer-motion";
import { ArrowRight, HeartPulse, Lock, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, useAuth } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  { role: "Patient", email: "patient@sevasetu.in", detail: "Sunita Jadhav · Hadapsar" },
  { role: "ASHA worker", email: "asha@sevasetu.gov.in", detail: "Kavita More · Hadapsar Ward 4" },
  { role: "Doctor", email: "doctor@sevasetu.gov.in", detail: "Dr. Anjali Deshpande · Sassoon" },
  { role: "Hospital admin", email: "admin@sevasetu.gov.in", detail: "Dr. Rajendra Kulkarni" },
  { role: "District Health Officer", email: "dho@sevasetu.gov.in", detail: "Dr. Sheetal Deshmukh" },
  { role: "Emergency response", email: "emergency@sevasetu.gov.in", detail: "108 Control Room" },
];

interface FormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const { register, handleSubmit, setValue, formState } = useForm<FormValues>({
    defaultValues: { email: "patient@sevasetu.in", password: "Seva@1234" },
  });

  React.useEffect(() => {
    if (user) router.replace(ROLE_HOME[user.role]);
  }, [user, router]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const account = await login(values.email.trim(), values.password);
      toast.success(`Welcome back, ${account.full_name}`);
      router.replace(ROLE_HOME[account.role]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--primary)] via-[color-mix(in_srgb,var(--primary)_60%,var(--secondary))] to-[var(--secondary)] p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <HeartPulse className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold">SevaSetu AI</span>
        </div>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">
            Quality public healthcare, delivered to every rural and underserved community.
          </h2>
          <p className="mt-4 max-w-md text-white/80">
            Secure, role-based access for patients, ASHA workers, medical officers, hospital administrators and
            the district health administration.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-white/80">
            <ShieldCheck className="h-4 w-4" /> JWT secured · bcrypt hashed · refresh token rotation
          </div>
        </div>
        <p className="text-xs text-white/60">
          Government of Maharashtra · Public Health Department
        </p>
      </div>

      <div className="flex flex-col px-3 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:hidden">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sign in</h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)]">
              Use your SevaSetu credentials or pick a demo account below.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 sm:mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input id="email" type="email" className="pl-9" {...register("email", { required: true })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    {...register("password", { required: true, minLength: 6 })}
                  />
                </div>
                {formState.errors.password ? (
                  <p className="text-xs text-[var(--danger)]">Password must be at least 6 characters.</p>
                ) : null}
              </div>
              <Button type="submit" size="lg" className="w-full min-h-[48px]" loading={submitting}>
                Sign in <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-4 text-xs sm:text-sm text-[var(--muted-foreground)]">
              New to SevaSetu?{" "}
              <Link href="/register" className="font-semibold text-[var(--primary)] hover:underline">
                Create an account
              </Link>
            </p>

            <Card className="mt-6 sm:mt-8">
              <CardContent className="p-3 sm:p-4">
                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Demo accounts · password Seva@1234
                </p>
                <div className="mt-3 grid gap-2">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setValue("email", account.email);
                        setValue("password", "Seva@1234");
                        toast.info(`${account.role} credentials filled`);
                      }}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-[var(--border)] px-3 py-2.5 text-left transition-colors hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] min-h-[44px] touch-target cursor-pointer"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs sm:text-sm font-medium truncate">{account.role}</span>
                        <span className="block text-[11px] sm:text-xs text-[var(--muted-foreground)] truncate">{account.detail}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-[var(--primary)]">Use</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
