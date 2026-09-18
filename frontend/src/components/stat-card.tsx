"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  primary: "bg-[#EAF4FC] dark:bg-[#1D5FA7]/20 text-[#1D5FA7] dark:text-[#5FA9E6] border border-[#C5DCF5] dark:border-[#1D5FA7]/40",
  info: "bg-[#EAF4FC] dark:bg-[#1D5FA7]/20 text-[#1D5FA7] dark:text-[#5FA9E6] border border-[#C5DCF5] dark:border-[#1D5FA7]/40",
  success: "bg-[#DCFCE7] dark:bg-[#16A34A]/20 text-[#16A34A] dark:text-[#4ADE80] border border-[#BBF7D0] dark:border-[#16A34A]/40",
  warning: "bg-[#FEF3C7] dark:bg-[#D97706]/20 text-[#D97706] dark:text-[#FBBF24] border border-[#FDE68A] dark:border-[#D97706]/40",
  danger: "bg-[#FEE2E2] dark:bg-[#DC2626]/20 text-[#DC2626] dark:text-[#F87171] border border-[#FECACA] dark:border-[#DC2626]/40",
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="card-surface rounded-xl sm:rounded-2xl p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] truncate">{label}</p>
          <p className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{hint}</p> : null}
        </div>
        <span className={cn("shrink-0 rounded-xl p-2.5 shadow-2xs", TONES[tone] ?? TONES.primary)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </motion.div>
  );
}
