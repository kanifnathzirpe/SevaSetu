import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | Date | null, withTime = false) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function relativeTime(value?: string | null) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name?: string) {
  if (!name) return "SS";
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function titleCase(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export const RISK_STYLES: Record<string, string> = {
  low: "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] dark:bg-[#16A34A]/20 dark:text-[#4ADE80] dark:border-[#16A34A]/40",
  routine: "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] dark:bg-[#16A34A]/20 dark:text-[#4ADE80] dark:border-[#16A34A]/40",
  moderate:
    "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-[#D97706]/20 dark:text-[#FBBF24] dark:border-[#D97706]/40",
  urgent:
    "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-[#D97706]/20 dark:text-[#FBBF24] dark:border-[#D97706]/40 font-medium",
  high: "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] dark:bg-[#DC2626]/20 dark:text-[#F87171] dark:border-[#DC2626]/40 font-medium",
  critical:
    "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] dark:bg-[#DC2626]/30 dark:text-[#F87171] dark:border-[#DC2626]/50 font-semibold",
  emergency:
    "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] dark:bg-[#DC2626]/30 dark:text-[#F87171] dark:border-[#DC2626]/50 font-semibold",
};

export const STATUS_STYLES: Record<string, string> = {
  // Scheduling & consultations
  scheduled: "bg-[#EAF4FC] text-[#1D5FA7] border border-[#C5DCF5] dark:bg-[#1D5FA7]/20 dark:text-[#5FA9E6] dark:border-[#1D5FA7]/40",
  checked_in: "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-[#D97706]/20 dark:text-[#FBBF24] dark:border-[#D97706]/40",
  in_progress: "bg-[#EAF4FC] text-[#1D5FA7] border border-[#C5DCF5] dark:bg-[#1D5FA7]/20 dark:text-[#5FA9E6] dark:border-[#1D5FA7]/40",
  completed: "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] dark:bg-[#16A34A]/20 dark:text-[#4ADE80] dark:border-[#16A34A]/40",
  cancelled: "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] dark:bg-[#DC2626]/20 dark:text-[#F87171] dark:border-[#DC2626]/40",
  // Referral lifecycle (Requirement 13: INITIATED: #1D5FA7/light blue, ACKNOWLEDGED: #5FA9E6/light blue, IN_TRANSIT: #D97706/amber, SEEN: #16A34A/green, CLOSED: #16A34A/green, CANCELLED: #DC2626/red)
  initiated: "bg-[#EAF4FC] text-[#1D5FA7] border border-[#C5DCF5] dark:bg-[#1D5FA7]/20 dark:text-[#5FA9E6] dark:border-[#1D5FA7]/40",
  acknowledged: "bg-[#EAF4FC] text-[#5FA9E6] border border-[#C5DCF5] dark:bg-[#1D5FA7]/20 dark:text-[#5FA9E6] dark:border-[#1D5FA7]/40",
  in_transit: "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-[#D97706]/20 dark:text-[#FBBF24] dark:border-[#D97706]/40",
  seen: "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] dark:bg-[#16A34A]/20 dark:text-[#4ADE80] dark:border-[#16A34A]/40",
  closed: "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] dark:bg-[#16A34A]/20 dark:text-[#4ADE80] dark:border-[#16A34A]/40",
  accepted: "bg-[#EAF4FC] text-[#1D5FA7] border border-[#C5DCF5] dark:bg-[#1D5FA7]/20 dark:text-[#5FA9E6] dark:border-[#1D5FA7]/40",
  pending: "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-[#D97706]/20 dark:text-[#FBBF24] dark:border-[#D97706]/40",
  // Visits & tasks
  planned: "bg-[#EAF4FC] text-[#1D5FA7] border border-[#C5DCF5] dark:bg-[#1D5FA7]/20 dark:text-[#5FA9E6] dark:border-[#1D5FA7]/40",
  missed: "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] dark:bg-[#DC2626]/20 dark:text-[#F87171] dark:border-[#DC2626]/40",
  due: "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-[#D97706]/20 dark:text-[#FBBF24] dark:border-[#D97706]/40",
  overdue: "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] dark:bg-[#DC2626]/20 dark:text-[#F87171] dark:border-[#DC2626]/40 font-medium",
  // Facilities & assets
  available: "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] dark:bg-[#16A34A]/20 dark:text-[#4ADE80] dark:border-[#16A34A]/40",
  on_duty: "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-[#D97706]/20 dark:text-[#FBBF24] dark:border-[#D97706]/40",
  maintenance: "bg-[#F1F5F9] text-[#52667A] border border-[#D7E0EA] dark:bg-[#1E3A5F] dark:text-[#CBD5E1] dark:border-[#234268]",
};

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
