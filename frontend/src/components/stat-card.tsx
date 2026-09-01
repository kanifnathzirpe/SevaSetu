"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  primary: "from-[color-mix(in_srgb,var(--primary)_20%,transparent)] to-transparent text-[var(--primary)]",
  success: "from-[color-mix(in_srgb,var(--success)_20%,transparent)] to-transparent text-[var(--success)]",
  warning: "from-[color-mix(in_srgb,var(--warning)_20%,transparent)] to-transparent text-[var(--warning)]",
  danger: "from-[color-mix(in_srgb,var(--danger)_18%,transparent)] to-transparent text-[var(--danger)]",
  info: "from-[color-mix(in_srgb,var(--info)_18%,transparent)] to-transparent text-[var(--info)]",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  index = 0,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES | string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="card-surface relative overflow-hidden rounded-2xl p-5"
    >
      <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-70", TONES[tone] ?? TONES.primary)} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p> : null}
        </div>
        <span className={cn("rounded-xl bg-[var(--card)] p-2.5 shadow-sm", TONES[tone] ?? TONES.primary)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </motion.div>
  );
}
