import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <Image src="/logo.png" 
            alt="SevaSetu Logo" 
            width={50} 
            height={50} 
            className="rounded-xl" />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-bold tracking-tight">SevaSetu</span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Public Health
          </span>
        </span>
      )}
    </Link>
  );
}
