import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "primary" | "success" | "warning" | "danger" | "info" }) {
  const tones: Record<string, string> = {
    default: "bg-[var(--muted)] text-[var(--muted-foreground)]",
    primary: "bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]",
    success: "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]",
    warning: "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)]",
    danger: "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]",
    info: "bg-[color-mix(in_srgb,var(--info)_15%,transparent)] text-[var(--info)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
