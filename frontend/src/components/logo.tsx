import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

export function Logo({ className, compact = false, light = false }: { className?: string; compact?: boolean; light?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <Image src="/images/logo.png"
            alt="SevaSetu Logo"
            width={compact ? 35 : 50}
            height={compact ? 35 : 50}
            className="rounded-xl" />
      {!compact && (
        <span className="leading-tight">
          <span className={cn("block text-base font-bold tracking-tight", light ? "text-white" : "text-[var(--foreground)]")}>SevaSetu</span>
          <span className={cn("block text-[10px] uppercase tracking-[0.16em]", light ? "text-white/70" : "text-[var(--muted-foreground)]")}>
            PUBLIC HEALTH
          </span>
        </span>
      )}
    </Link>
  );
}
