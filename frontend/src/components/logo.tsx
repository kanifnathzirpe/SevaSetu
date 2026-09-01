import Link from "next/link";
import { HeartPulse } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg">
        <HeartPulse className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-bold tracking-tight">SevaSetu AI</span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Public Health
          </span>
        </span>
      )}
    </Link>
  );
}
