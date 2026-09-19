"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  FileText,
  Home,
  Hospital,
  MapPinned,
  Menu,
  MessageSquare,
  Package,
  Pill,
  Radar,
  Siren,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { AuthUser, Role } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useI18n, NAV_LABEL_KEY } from "@/lib/i18n";

interface BottomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  isSpecial?: boolean;
}

const PRIMARY_NAV_BY_ROLE: Record<Role, BottomNavItem[]> = {
  patient: [
    { label: "Dashboard", href: "/patient", icon: Home },
    { label: "Appointments", href: "/patient/appointments", icon: CalendarDays },
    { label: "Emergency", href: "/patient/emergency", icon: Siren, isSpecial: true },
    { label: "Nearby", href: "/patient/hospitals", icon: Hospital },
  ],
  asha: [
    { label: "Dashboard", href: "/asha", icon: Home },
    { label: "Households", href: "/asha/households", icon: Users },
    { label: "Visits", href: "/asha/visits", icon: CalendarDays },
    { label: "Chat", href: "/chat", icon: MessageSquare },
  ],
  doctor: [
    { label: "Dashboard", href: "/doctor", icon: Home },
    { label: "Appointments", href: "/doctor/appointments", icon: CalendarDays },
    { label: "Queue", href: "/doctor/queue", icon: Users },
    { label: "Prescriptions", href: "/doctor/prescriptions", icon: Pill },
  ],
  hospital_admin: [
    { label: "Dashboard", href: "/admin", icon: Home },
    { label: "Hospitals", href: "/admin/hospitals", icon: Hospital },
    { label: "Inventory", href: "/admin/inventory", icon: Package },
    { label: "Heatmap", href: "/admin/heatmap", icon: Radar },
  ],
  dho: [
    { label: "Dashboard", href: "/admin", icon: Home },
    { label: "Reports", href: "/admin/reports", icon: FileText },
    { label: "Heatmap", href: "/admin/heatmap", icon: Radar },
    { label: "Hospitals", href: "/admin/hospitals", icon: Hospital },
  ],
  emergency: [
    { label: "Console", href: "/emergency", icon: Siren, isSpecial: true },
    { label: "Map", href: "/emergency/map", icon: MapPinned },
    { label: "Cases", href: "/emergency/cases", icon: FileText },
  ],
};

export function BottomNav({ user, onOpenMenu }: { user: AuthUser; onOpenMenu: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const items = PRIMARY_NAV_BY_ROLE[user.role] ?? [];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 block border-t border-[var(--border)] bg-[var(--card)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const translatedLabel = t(NAV_LABEL_KEY[item.label] ?? item.label);

          if (item.isSpecial) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center min-h-[48px] min-w-[54px] px-1 group"
                aria-label={translatedLabel}
              >
                <div className="flex h-10 w-10 -translate-y-2 items-center justify-center rounded-full bg-[var(--danger)] text-white shadow-md transition-transform active:scale-95">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="-mt-1 text-[10px] font-semibold text-[var(--danger)]">
                  {translatedLabel.split(" ")[0]}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center min-h-[48px] min-w-[50px] px-1 py-1 text-center transition-colors touch-target",
                active && item.label === "Nearby" ? "text-white font-semibold" : active ? "text-[var(--primary)] font-semibold" : "text-[#52667A] dark:text-[#CBD5E1] hover:text-[#102A43] dark:hover:text-[#F8FAFC]"
              )}
            >
              <div className="relative flex items-center justify-center">
                <item.icon className="h-5 w-5 shrink-0" />
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className={cn(
                      "absolute -inset-1.5 -z-10 rounded-xl",
                      item.label === "Nearby" ? "bg-[var(--primary)]" : "bg-[var(--primary-light)]"
                    )}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span className="mt-1 max-w-[80px] truncate text-[10px] font-medium leading-tight">
                {translatedLabel.split(" ")[0]}
              </span>
            </Link>
          );
        })}

        {/* Menu drawer button */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center min-h-[48px] min-w-[50px] px-1 py-1 text-[#52667A] dark:text-[#CBD5E1] hover:text-[#102A43] dark:hover:text-[#F8FAFC] touch-target cursor-pointer"
          aria-label={t("all") || "All sections"}
        >
          <Menu className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-medium leading-tight">{t("all") || "All"}</span>
        </button>
      </div>
    </nav>
  );
}
