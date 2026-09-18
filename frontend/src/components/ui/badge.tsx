import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "primary" | "success" | "warning" | "danger" | "info" }) {
  const tones: Record<string, string> = {
    default: "bg-[#F1F5F9] dark:bg-[#1E3A5F] text-[#52667A] dark:text-[#CBD5E1] border border-[#D7E0EA] dark:border-[#234268]",
    primary: "bg-[#EAF4FC] dark:bg-[#1D5FA7]/20 text-[#123B6D] dark:text-[#5FA9E6] border border-[#C5DCF5] dark:border-[#1D5FA7]/40",
    success: "bg-[#DCFCE7] dark:bg-[#16A34A]/20 text-[#16A34A] dark:text-[#4ADE80] border border-[#BBF7D0] dark:border-[#16A34A]/40",
    warning: "bg-[#FEF3C7] dark:bg-[#D97706]/20 text-[#D97706] dark:text-[#FBBF24] border border-[#FDE68A] dark:border-[#D97706]/40",
    danger: "bg-[#FEE2E2] dark:bg-[#DC2626]/20 text-[#DC2626] dark:text-[#F87171] border border-[#FECACA] dark:border-[#DC2626]/40 font-semibold",
    info: "bg-[#EAF4FC] dark:bg-[#1D5FA7]/20 text-[#1D5FA7] dark:text-[#5FA9E6] border border-[#C5DCF5] dark:border-[#1D5FA7]/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
