"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Lock,
  Mail,
  MapPin,
  Shield,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_HOME, useAuth } from "@/lib/auth";
import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { role: "Patient", email: "patient@sevasetu.in", name: "Sunita Jadhav", detail: "Patient · Hadapsar" },
  { role: "Doctor", email: "doctor@sevasetu.gov.in", name: "Dr. Anjali Deshpande", detail: "Medical Officer · Sassoon Hospital" },
  { role: "Health Worker", email: "asha@sevasetu.gov.in", name: "Kavita More", detail: "ASHA Worker · Ward 4" },
  { role: "Hospital admin", email: "admin@sevasetu.gov.in", name: "Dr. Rajendra Kulkarni", detail: "Hospital Administrator" },
  { role: "District Health Officer", email: "dho@sevasetu.gov.in", name: "Dr. Sheetal Deshmukh", detail: "DHO · Pune District" },
  { role: "Emergency response", email: "emergency@sevasetu.gov.in", name: "108 Control Room", detail: "Emergency Dispatch" },
];

interface FormValues {
  email: string;
  password: string;
}

type SelectedRole = "Patient" | "Doctor" | "Health Worker";

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const { locale, setLocale } = useI18n();

  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<SelectedRole>("Patient");
  const [langDropdownOpen, setLangDropdownOpen] = React.useState(false);
  const [showOtherDemoRoles, setShowOtherDemoRoles] = React.useState(false);

  const { register, handleSubmit, setValue, formState } = useForm<FormValues>({
    defaultValues: { email: "patient@sevasetu.in", password: "Seva@1234" },
  });

  React.useEffect(() => {
    if (user) router.replace(ROLE_HOME[user.role]);
  }, [user, router]);

  // Handle role segmented control click
  const handleRoleSelect = (role: SelectedRole) => {
    setSelectedRole(role);
    if (role === "Patient") {
      setValue("email", "patient@sevasetu.in");
      setValue("password", "Seva@1234");
      toast.info("Patient demo credentials applied (Sunita Jadhav)");
    } else if (role === "Doctor") {
      setValue("email", "doctor@sevasetu.gov.in");
      setValue("password", "Seva@1234");
      toast.info("Doctor demo credentials applied (Dr. Anjali Deshpande)");
    } else if (role === "Health Worker") {
      setValue("email", "asha@sevasetu.gov.in");
      setValue("password", "Seva@1234");
      toast.info("ASHA / Health Worker demo credentials applied (Kavita More)");
    }
  };

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

  const handleAbhaLogin = () => {
    setSelectedRole("Patient");
    setValue("email", "patient@sevasetu.in");
    setValue("password", "Seva@1234");
    toast.success("ABHA Health ID (14-8921-4402-9912) verified for Sunita Jadhav. Click 'Sign In' to enter.");
  };

  const currentLocaleInfo = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <div className="min-h-screen w-full bg-[#F5F8FC] dark:bg-[#0B1E36] flex flex-col lg:flex-row overflow-x-hidden">
      {/* ========================================================================= */}
      {/* LEFT PANEL: 50% VIEWPORT WIDTH, 100% HEIGHT WITH HOSPITAL PHOTOGRAPH       */}
      {/* ========================================================================= */}
      <div className="relative w-full lg:w-[50vw] lg:min-h-screen flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Layer 1: The uploaded actual Government Hospital photograph */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-no-repeat transition-transform duration-700"
          style={{
            backgroundImage: "url('/images/hospital_hero.jpg')",
            backgroundPosition: "center 28%",
          }}
        />

        {/* Layer 2: Deep Government-Blue Overlay (rgba(11, 47, 91, 0.82)) */}
        {/* The hospital building, "GOVERNMENT HOSPITAL" sign, and Indian flag remain clearly visible underneath */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundColor: "rgba(11, 47, 91, 0.82)",
            background:
              "linear-gradient(180deg, rgba(18, 59, 109, 0.84) 0%, rgba(14, 50, 93, 0.78) 45%, rgba(11, 47, 91, 0.86) 100%)",
          }}
        />

        {/* Layer 3: Subtle curved / diagonal blue gradient shape toward the bottom */}
        <div className="absolute inset-x-0 bottom-0 h-44 z-0 pointer-events-none bg-gradient-to-t from-[#0B2F5B] via-[#0B2F5B]/70 to-transparent" />

        {/* Layer 4: Interactive Content Overlay */}
        <div className="relative z-10 p-6 sm:p-10 lg:px-14 lg:py-10 flex flex-col justify-between h-full min-h-[600px] lg:min-h-screen text-white">
          {/* TOP SECTION: Logo + Government Campaign Tagline */}
          <div className="flex items-start justify-between gap-4 pt-1 sm:pt-2">
            {/* SevaSetu Branding (32-40px from top, 48-64px from left on desktop) */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative h-12 w-12 rounded-xl bg-white shadow-md flex items-center justify-center shrink-0 border border-white/20">
                <Image
                  src="/images/logo.png"
                  alt="SevaSetu Logo"
                  width={50}
                  height={50}
                  className="object-contain"
                />
              </div>
              <div>
                <span className="block text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-[#DCEBFA] transition-colors">
                  SevaSetu
                </span>
                <span className="block text-xs font-medium text-[#DCEBFA]/90 tracking-wide">
                  Sarkari Seva, Aapke Paas
                </span>
              </div>
            </Link>

            {/* Top-Right Government Campaign Tagline */}
            <div className="text-right select-none pl-2">
              <div className="font-serif italic text-white/95 text-xs sm:text-sm leading-tight tracking-wider uppercase font-semibold">
                <span>Swashth</span><br />
                <span>Nagrik</span><br />
                <span className="text-[#5FA9E6]">Sashakt</span><br />
                <span className="text-[#5FA9E6]">Bharat</span>
              </div>
              <svg className="w-16 sm:w-20 h-1.5 ml-auto mt-1 text-[#5FA9E6]" viewBox="0 0 70 6" fill="none">
                <path d="M2 3C22 5 48 1 68 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* MIDDLE SECTION: Headline, Description & 4 Features */}
          <div className="my-8 lg:my-auto max-w-xl">
            {/* Hero Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-bold text-white tracking-tight leading-[1.12]">
              Healthcare<br />
              Services<br />
              for a <span className="text-[#5FA9E6]">Healthier</span><br />
              <span className="text-[#5FA9E6]">Tomorrow</span>
            </h1>

            {/* Description */}
            <p className="mt-4 text-[#DCEBFA] text-base sm:text-[17px] leading-relaxed max-w-[480px]">
              Access government health services, schemes and care — all in one place.
            </p>

            {/* Feature List (4 Healthcare Items) */}
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[530px]">
              {/* 1. BOOK APPOINTMENTS */}
              <div className="flex items-start gap-3 rounded-xl bg-white/[0.08] border border-white/15 p-3 hover:bg-white/[0.12] transition-colors backdrop-blur-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1D5FA7]/40 border border-[#5FA9E6]/40 text-[#5FA9E6]">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide uppercase">
                    Book Appointments
                  </h3>
                  <p className="text-xs text-[#DCEBFA]/90 leading-snug mt-0.5">
                    Find and book at nearby government hospitals
                  </p>
                </div>
              </div>

              {/* 2. ACCESS GOVERNMENT SCHEMES */}
              <div className="flex items-start gap-3 rounded-xl bg-white/[0.08] border border-white/15 p-3 hover:bg-white/[0.12] transition-colors backdrop-blur-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1D5FA7]/40 border border-[#5FA9E6]/40 text-[#5FA9E6]">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide uppercase">
                    Access Government Schemes
                  </h3>
                  <p className="text-xs text-[#DCEBFA]/90 leading-snug mt-0.5">
                    Explore and apply for health schemes
                  </p>
                </div>
              </div>

              {/* 3. MANAGE HEALTH RECORDS */}
              <div className="flex items-start gap-3 rounded-xl bg-white/[0.08] border border-white/15 p-3 hover:bg-white/[0.12] transition-colors backdrop-blur-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1D5FA7]/40 border border-[#5FA9E6]/40 text-[#5FA9E6]">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide uppercase">
                    Manage Health Records
                  </h3>
                  <p className="text-xs text-[#DCEBFA]/90 leading-snug mt-0.5">
                    Keep your reports, prescriptions and health card handy
                  </p>
                </div>
              </div>

              {/* 4. FIND NEARBY FACILITIES */}
              <div className="flex items-start gap-3 rounded-xl bg-white/[0.08] border border-white/15 p-3 hover:bg-white/[0.12] transition-colors backdrop-blur-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1D5FA7]/40 border border-[#5FA9E6]/40 text-[#5FA9E6]">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide uppercase">
                    Find Nearby Facilities
                  </h3>
                  <p className="text-xs text-[#DCEBFA]/90 leading-snug mt-0.5">
                    Locate hospitals, clinics and emergency care centers
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Indian Public Health Status & Hashtags */}
          <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-[#DCEBFA]/90">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#5FA9E6]" />
              <span className="font-medium">A healthier India, together</span>
            </div>
            <div className="flex items-center gap-2 text-[#5FA9E6] font-semibold text-[11px]">
              <span>#SevaSetu</span>
              <span className="text-white/40">•</span>
              <span>#HealthForAll</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: 50% VIEWPORT WIDTH, CLEAN PROFESSIONAL GOVERNMENT LOGIN CARD   */}
      {/* ========================================================================= */}
      <div className="relative w-full lg:w-[50vw] lg:min-h-screen flex flex-col justify-between p-4 sm:p-8 lg:p-12 overflow-y-auto">
        {/* TOP RIGHT CONTROLS: Language Selector & Theme Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full max-w-[540px] mx-auto mb-4">
          <div className="lg:hidden">
            <span className="text-xs font-semibold text-[#123B6D] dark:text-[#5FA9E6]">
              Government of India · Digital Health
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Language Selector (Outlined rounded selector, border #D7E0EA, text #102A43) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 rounded-full border border-[#D7E0EA] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3.5 py-1.5 text-xs font-medium text-[#102A43] dark:text-[#F8FAFC] shadow-2xs hover:bg-[#F5F8FC] dark:hover:bg-[#28374D] transition-colors cursor-pointer"
                aria-label="Select language"
              >
                <Globe className="h-3.5 w-3.5 text-[#1D5FA7] dark:text-[#5FA9E6]" />
                <span>{currentLocaleInfo.label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#52667A] dark:text-[#94A3B8]" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-40 rounded-xl border border-[#D7E0EA] dark:border-[#334155] bg-white dark:bg-[#1E293B] py-1.5 shadow-lg z-50">
                  {LOCALES.map((loc) => (
                    <button
                      key={loc.code}
                      type="button"
                      onClick={() => {
                        setLocale(loc.code);
                        setLangDropdownOpen(false);
                        toast.info(`Language set to ${loc.label}`);
                      }}
                      className={cn(
                        "w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#F5F8FC] dark:hover:bg-[#334155] transition-colors cursor-pointer",
                        locale === loc.code
                          ? "font-bold text-[#123B6D] dark:text-[#5FA9E6] bg-[#EAF4FC]/60 dark:bg-[#123B6D]/30"
                          : "text-[#102A43] dark:text-[#F8FAFC]"
                      )}
                    >
                      <span>{loc.label}</span>
                      <span className="text-[10px] text-[#52667A] dark:text-[#94A3B8]">{loc.labelEn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark/Light theme toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* CENTERED LOGIN CARD (~500–550px width, clean white, subtle border #E5EBF2) */}
        <div className="w-full max-w-[540px] mx-auto my-auto py-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-[#E5EBF2] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-6 sm:p-8 lg:p-9 shadow-xs"
          >
            {/* LOGIN HEADER */}
            <div className="mb-6 text-center sm:text-left">
              <p className="text-xs sm:text-sm font-medium text-[#52667A] dark:text-[#94A3B8]">
                Welcome to
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123B6D] dark:text-white tracking-tight">
                Seva<span className="text-[#1D5FA7] dark:text-[#5FA9E6]">Setu</span>
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#52667A] dark:text-[#94A3B8]">
                Sign in to access your health services
              </p>
            </div>

            {/* ROLE SELECTOR (Patient, Doctor, Health Worker) */}
            <div className="mb-6">
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F5F8FC] dark:bg-[#0F172A] p-1.5 border border-[#D7E0EA] dark:border-[#334155]">
                {/* Patient */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect("Patient")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] cursor-pointer",
                    selectedRole === "Patient"
                      ? "bg-[#123B6D] text-white shadow-xs"
                      : "text-[#102A43] dark:text-[#CBD5E1] hover:bg-white/80 dark:hover:bg-[#1E293B]"
                  )}
                >
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Patient</span>
                </button>

                {/* Doctor */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect("Doctor")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] cursor-pointer",
                    selectedRole === "Doctor"
                      ? "bg-[#123B6D] text-white shadow-xs"
                      : "text-[#102A43] dark:text-[#CBD5E1] hover:bg-white/80 dark:hover:bg-[#1E293B]"
                  )}
                >
                  <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Doctor</span>
                </button>

                {/* Health Worker */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect("Health Worker")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] cursor-pointer",
                    selectedRole === "Health Worker"
                      ? "bg-[#123B6D] text-white shadow-xs"
                      : "text-[#102A43] dark:text-[#CBD5E1] hover:bg-white/80 dark:hover:bg-[#1E293B]"
                  )}
                >
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Health Worker</span>
                </button>
              </div>
            </div>

            {/* LOGIN FORM (Preserving exact logic and inputs) */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Mobile Number / Email Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs sm:text-sm font-semibold text-[#102A43] dark:text-[#F8FAFC]"
                >
                  Mobile Number / Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#123B6D] dark:text-[#5FA9E6]" />
                  <input
                    id="email"
                    type="text"
                    placeholder="name@sevasetu.in or 9876543210"
                    className="w-full h-[54px] pl-10 pr-3.5 rounded-xl border border-[#CBD5E1] dark:border-[#475569] bg-white dark:bg-[#0F172A] text-sm text-[#102A43] dark:text-[#F8FAFC] placeholder:text-[#7A8A9A] focus:outline-none focus:border-[#1D5FA7] focus:ring-3 focus:ring-[#1D5FA7]/15 transition-all"
                    {...register("email", { required: true })}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs sm:text-sm font-semibold text-[#102A43] dark:text-[#F8FAFC]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info("Demo password is 'Seva@1234'. Choose any role tab above for instant fill.")
                    }
                    className="text-xs font-semibold text-[#1D5FA7] dark:text-[#5FA9E6] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#123B6D] dark:text-[#5FA9E6]" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full h-[54px] pl-10 pr-10 rounded-xl border border-[#CBD5E1] dark:border-[#475569] bg-white dark:bg-[#0F172A] text-sm text-[#102A43] dark:text-[#F8FAFC] placeholder:text-[#7A8A9A] focus:outline-none focus:border-[#1D5FA7] focus:ring-3 focus:ring-[#1D5FA7]/15 transition-all"
                    {...register("password", { required: true, minLength: 6 })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7A8A9A] hover:text-[#102A43] dark:hover:text-white cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formState.errors.password && (
                  <p className="text-xs text-[#DC2626]">Password must be at least 6 characters.</p>
                )}
              </div>

              {/* PRIMARY SIGN IN BUTTON (#123B6D, hover #0B2F5B, 54-58px height) */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-[54px] mt-2 rounded-xl bg-[#123B6D] hover:bg-[#0B2F5B] active:bg-[#082242] text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* ABHA / AADHAAR BUTTON (White background, blue border, navy text) */}
              <button
                type="button"
                onClick={handleAbhaLogin}
                className="w-full h-[52px] rounded-xl border-1.5 border-[#1D5FA7] dark:border-[#5FA9E6] bg-white dark:bg-[#1E293B] hover:bg-[#EAF4FC] dark:hover:bg-[#123B6D]/30 text-[#123B6D] dark:text-[#5FA9E6] font-semibold text-sm flex items-center justify-between px-4 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1D5FA7]/10 dark:bg-[#5FA9E6]/20 text-[#1D5FA7] dark:text-[#5FA9E6]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span>Login with ABHA / Aadhaar</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* CREATE ACCOUNT LINK */}
            <div className="mt-5 text-center text-xs sm:text-sm text-[#52667A] dark:text-[#94A3B8]">
              <span>New to SevaSetu? </span>
              <Link href="/register" className="font-semibold text-[#1D5FA7] dark:text-[#5FA9E6] hover:underline">
                Create an account
              </Link>
            </div>

            {/* ADMINISTRATIVE DEMO ACCOUNTS TOGGLE */}
            <div className="mt-5 pt-4 border-t border-[#E5EBF2] dark:border-[#334155]">
              <button
                type="button"
                onClick={() => setShowOtherDemoRoles(!showOtherDemoRoles)}
                className="w-full flex items-center justify-between text-xs font-semibold text-[#52667A] dark:text-[#94A3B8] hover:text-[#123B6D] dark:hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                  <span>Administrative & Other Demo Roles</span>
                </span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", showOtherDemoRoles && "rotate-180")}
                />
              </button>

              {showOtherDemoRoles && (
                <div className="mt-3 grid gap-2 pt-1">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setValue("email", account.email);
                        setValue("password", "Seva@1234");
                        toast.info(`${account.role} credentials loaded (${account.name})`);
                      }}
                      className="flex items-center justify-between gap-2.5 rounded-lg border border-[#D7E0EA] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3 py-2 text-left hover:border-[#1D5FA7] hover:bg-[#EAF4FC]/60 dark:hover:bg-[#123B6D]/20 transition-all cursor-pointer"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-[#102A43] dark:text-white truncate">
                          {account.role}
                        </span>
                        <span className="block text-[11px] text-[#52667A] dark:text-[#94A3B8] truncate">
                          {account.name} · {account.detail}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-bold text-[#1D5FA7] dark:text-[#5FA9E6] bg-white dark:bg-[#1E293B] border border-[#D7E0EA] dark:border-[#334155] px-2 py-0.5 rounded-md">
                        Use
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* TRUST STRIP (Built for Public Healthcare, Government Health Services, Secure & Private) */}
          <div className="mt-6 flex items-center justify-around rounded-xl border border-[#D7E0EA] dark:border-[#334155] bg-white/80 dark:bg-[#1E293B]/70 backdrop-blur-xs py-3.5 px-4 shadow-2xs text-center">
            {/* Item 1 */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 text-[#123B6D] dark:text-[#5FA9E6]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#123B6D] dark:text-[#5FA9E6]" />
              <div className="text-left">
                <span className="block text-xs font-bold leading-tight text-[#102A43] dark:text-[#F8FAFC]">
                  Built for
                </span>
                <span className="block text-[11px] text-[#52667A] dark:text-[#94A3B8] leading-tight">
                  Public Healthcare
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-7 w-[1px] bg-[#D7E0EA] dark:bg-[#334155]" />

            {/* Item 2 */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 text-[#123B6D] dark:text-[#5FA9E6]">
              <Users className="h-4 w-4 shrink-0 text-[#123B6D] dark:text-[#5FA9E6]" />
              <div className="text-left">
                <span className="block text-xs font-bold leading-tight text-[#102A43] dark:text-[#F8FAFC]">
                  Government
                </span>
                <span className="block text-[11px] text-[#52667A] dark:text-[#94A3B8] leading-tight">
                  Health Services
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-7 w-[1px] bg-[#D7E0EA] dark:bg-[#334155]" />

            {/* Item 3 */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 text-[#123B6D] dark:text-[#5FA9E6]">
              <Lock className="h-4 w-4 shrink-0 text-[#123B6D] dark:text-[#5FA9E6]" />
              <div className="text-left">
                <span className="block text-xs font-bold leading-tight text-[#102A43] dark:text-[#F8FAFC]">
                  Secure &
                </span>
                <span className="block text-[11px] text-[#52667A] dark:text-[#94A3B8] leading-tight">
                  Private
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM RIGHT DECORATIVE INDIA / GOVERNMENT ARCHITECTURAL SILHOUETTE */}
        <div className="relative w-full max-w-[540px] mx-auto mt-4 pt-3 flex flex-col items-center justify-center text-center">
          <svg
            className="w-48 h-10 text-[#123B6D]/15 dark:text-white/10 pointer-events-none mb-1"
            viewBox="0 0 240 50"
            fill="currentColor"
          >
            {/* Base platform */}
            <rect x="10" y="44" width="220" height="3" rx="1.5" />
            <rect x="25" y="41" width="190" height="3" rx="1.5" />
            {/* Central memorial / India Gate arch */}
            <rect x="90" y="16" width="60" height="25" rx="1" />
            <path d="M104 41 V28 C104 22 136 22 136 28 V41 Z" fill="#F5F8FC" className="dark:fill-[#0B1E36]" />
            <rect x="85" y="13" width="70" height="3" rx="1" />
            <rect x="95" y="8" width="50" height="5" rx="1" />
            <rect x="105" y="5" width="30" height="3" rx="1" />
            {/* Colonnade wings */}
            <rect x="35" y="24" width="45" height="17" rx="0.5" />
            <rect x="160" y="24" width="45" height="17" rx="0.5" />
            {/* Pillars */}
            <rect x="42" y="27" width="3" height="14" />
            <rect x="52" y="27" width="3" height="14" />
            <rect x="62" y="27" width="3" height="14" />
            <rect x="72" y="27" width="3" height="14" />
            <rect x="167" y="27" width="3" height="14" />
            <rect x="177" y="27" width="3" height="14" />
            <rect x="187" y="27" width="3" height="14" />
            <rect x="197" y="27" width="3" height="14" />
          </svg>
          <p className="text-[11px] text-[#52667A] dark:text-[#64748B]">
            Ministry of Health & Family Welfare · Government of India
          </p>
        </div>
      </div>
    </div>
  );
}
