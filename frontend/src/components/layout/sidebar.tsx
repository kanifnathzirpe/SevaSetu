"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { Logo } from "@/components/logo";
import { NAV_BY_ROLE, ROLE_LABEL } from "@/lib/nav";
import type { AuthUser } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Sidebar({ user, onNavigate }: { user: AuthUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = NAV_BY_ROLE[user.role];

  return (
    <aside className="flex h-full w-72 flex-col gap-6 overflow-y-auto border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_86%,transparent)] px-4 py-5 backdrop-blur-xl">
      <Logo />
      <div className="rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3 py-2.5">
        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Signed in as</p>
        <p className="truncate text-sm font-semibold">{user.full_name}</p>
        <p className="text-xs text-[var(--primary)]">{ROLE_LABEL[user.role]}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active =
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "text-[var(--primary)]"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 -z-10 rounded-xl bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className="px-2 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
        Government of Maharashtra · Public Health Department · Pune District
      </p>
    </aside>
  );
}
