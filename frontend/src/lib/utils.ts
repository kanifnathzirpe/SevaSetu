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
  low: "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_35%,transparent)]",
  moderate:
    "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_35%,transparent)]",
  high: "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_35%,transparent)]",
  critical:
    "bg-[color-mix(in_srgb,var(--danger)_22%,transparent)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_45%,transparent)]",
};

export const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-[color-mix(in_srgb,var(--info)_15%,transparent)] text-[var(--info)]",
  checked_in: "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]",
  in_progress: "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--primary)]",
  completed: "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]",
  cancelled: "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]",
  planned: "bg-[color-mix(in_srgb,var(--info)_15%,transparent)] text-[var(--info)]",
  missed: "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]",
  due: "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]",
  overdue: "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]",
  available: "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]",
  on_duty: "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]",
  maintenance: "bg-[color-mix(in_srgb,var(--muted-foreground)_18%,transparent)] text-[var(--muted-foreground)]",
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
