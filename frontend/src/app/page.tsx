"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Ambulance,
  ArrowRight,
  Baby,
  BarChart3,
  Building2,
  CheckCircle2,
  Globe2,
  HeartPulse,
  Hospital,
  MessageSquare,
  ShieldCheck,
  Siren,
  Stethoscope,
  Syringe,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATS = [
  { label: "Patients registered", value: "100+", icon: Users },
  { label: "Doctors on network", value: "40", icon: Stethoscope },
  { label: "Government facilities", value: "15", icon: Hospital },
  { label: "108 / 102 ambulances", value: "20", icon: Ambulance },
];

const FEATURES = [
  {
    icon: Activity,
    title: "AI symptom triage",
    body: "Rule-based clinical triage trained on district disease patterns suggests the right department and flags red-flag symptoms instantly.",
  },
  {
    icon: Siren,
    title: "One-click emergency SOS",
    body: "Auto-dispatches the nearest available 108 ambulance, computes live ETA and alerts the closest PHC or district hospital.",
  },
  {
    icon: Users,
    title: "ASHA field toolkit",
    body: "Household surveys, visit planner, pregnancy and immunisation tracking with an offline-first sync queue for low-network villages.",
  },
  {
    icon: Video,
    title: "Teleconsultation",
    body: "WebRTC-ready consultation rooms with waiting room, mute, camera controls and in-call chat for remote talukas.",
  },
  {
    icon: BarChart3,
    title: "District command centre",
    body: "Live bed occupancy, immunisation coverage, medicine stock-outs and outbreak forecasting for the District Health Officer.",
  },
  {
    icon: Syringe,
    title: "Universal immunisation",
    body: "Full UIP schedule from BCG at birth to DPT booster with due and overdue tracking for every child in the ward.",
  },
  {
    icon: Baby,
    title: "Maternal health",
    body: "ANC visit tracking, haemoglobin and BP trends, and automatic high-risk pregnancy escalation under Janani Suraksha Yojana.",
  },
  {
    icon: MessageSquare,
    title: "Care team chat",
    body: "Secure messaging between patients, ASHA workers and medical officers with unread tracking and typing indicators.",
  },
];

const ROLES = [
  { title: "Patient", body: "Book appointments, track medicines, download reports and raise an SOS.", href: "/login" },
  { title: "ASHA worker", body: "Plan visits, run surveys and escalate high-risk cases from the field.", href: "/login" },
  { title: "Doctor", body: "Run the OPD queue, prescribe digitally and consult over video.", href: "/login" },
  { title: "District Health Officer", body: "Monitor the whole district and act on outbreak forecasts.", href: "/login" },
];

const LOCALITIES = [
  "Shivajinagar", "Hinjewadi", "Baner", "Wakad", "Pimpri", "Chinchwad", "Hadapsar", "Katraj",
  "Warje", "Kondhwa", "Sinhagad Road", "Bhosari", "Aundh", "Yerwada", "Chakan", "Saswad",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_72%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="ml-8 hidden items-center gap-6 text-sm font-medium text-[var(--muted-foreground)] lg:flex">
            <a href="#features" className="transition-colors hover:text-[var(--foreground)]">Features</a>
            <a href="#roles" className="transition-colors hover:text-[var(--foreground)]">For every role</a>
            <a href="#coverage" className="transition-colors hover:text-[var(--foreground)]">Coverage</a>
            <a href="#demo" className="transition-colors hover:text-[var(--foreground)]">Demo access</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
              <ShieldCheck className="h-3.5 w-3.5" /> Smart India Hackathon 2026 · Public Health
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Bridging <span className="text-gradient">rural Pune</span> to quality public healthcare.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
              SevaSetu AI unifies patients, ASHA workers, medical officers, hospitals and the district
              administration on one platform — with AI triage, teleconsultation, emergency dispatch and
              real-time disease surveillance across every taluka of Pune district.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Launch the platform <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#demo">View demo logins</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--muted-foreground)]">
              {["ABHA-ready health IDs", "Works offline for ASHA", "Marathi · Hindi · English"].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass rounded-3xl p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-[color-mix(in_srgb,var(--card)_80%,transparent)] p-5">
                  <stat.icon className="h-5 w-5 text-[var(--primary)]" />
                  <p className="mt-3 text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--border)] p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <HeartPulse className="h-4 w-4 text-[var(--danger)]" /> Live district snapshot
              </p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
                <li>• 15 government facilities from sub-centres to Sassoon General Hospital</li>
                <li>• 25 ASHA workers covering 280+ households across 20 localities</li>
                <li>• Dengue, malaria and TB surveillance with weekly outbreak forecasting</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold tracking-tight">Everything a district health system needs</h2>
          <p className="mt-2 max-w-2xl text-[var(--muted-foreground)]">
            Built around the actual workflow of Maharashtra&apos;s public health ecosystem — from the sub-centre
            register to the District Health Officer&apos;s review meeting.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
              >
                <Card className="h-full transition-transform hover:-translate-y-1">
                  <CardContent className="p-5">
                    <span className="inline-flex rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] p-2.5 text-[var(--primary)]">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{feature.body}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold tracking-tight">One platform, six workspaces</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => (
              <Card key={role.title} className="group">
                <CardContent className="p-5">
                  <h3 className="font-semibold">{role.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{role.body}</p>
                  <Link
                    href={role.href}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]"
                  >
                    Open workspace
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="coverage" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)] p-8 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3">
            <Globe2 className="h-6 w-6 text-[var(--primary)]" />
            <h2 className="text-2xl font-bold tracking-tight">Coverage across Pune district</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
            Urban health centres, primary health centres, sub-centres, rural hospitals and district hospitals —
            mapped with live bed availability and ambulance positions.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {LOCALITIES.map((locality) => (
              <span
                key={locality}
                className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm"
              >
                {locality}
              </span>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Building2, title: "District & rural hospitals", body: "Sassoon, YCM Pimpri, Aundh, Chakan, Saswad" },
              { icon: Hospital, title: "PHCs & urban health centres", body: "Warje, Kondhwa, Hinjewadi, Wakad, Katraj, Hadapsar" },
              { icon: Ambulance, title: "Emergency network", body: "108 ALS/BLS ambulances and 102 maternity vans" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-[var(--border)] p-5">
                <item.icon className="h-5 w-5 text-[var(--primary)]" />
                <p className="mt-3 font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Try the live demo</h2>
          <p className="mt-2 text-[var(--muted-foreground)]">
            Every role has a pre-seeded account. Password for all demo accounts is
            <code className="mx-1 rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-sm">Seva@1234</code>.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/login">
              Go to sign in <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-[var(--muted-foreground)]">
            SevaSetu AI · Public Health Department, Pune District · Built for Smart India Hackathon 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
