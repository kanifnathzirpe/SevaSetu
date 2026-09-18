"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { Logo } from "@/components/logo";
import { NAV_BY_ROLE } from "@/lib/nav";
import type { AuthUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useI18n, NAV_LABEL_KEY, NAV_SECTION_KEY } from "@/lib/i18n";

export function Sidebar({ user, onNavigate }: { user: AuthUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = NAV_BY_ROLE[user.role];
  const { t } = useI18n();

  return (
    <aside className="flex h-full w-72 flex-col gap-6 overflow-y-auto border-r border-[var(--border)] bg-[var(--card)] px-4 py-5">
      <Logo />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t("sidebar.signedInAs")}</p>
        <p className="truncate text-sm font-semibold text-[var(--foreground)] mt-0.5">{user.full_name}</p>
        <p className="text-xs font-medium text-[var(--primary)]">{t(`role.${user.role}`)}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              {t(NAV_SECTION_KEY[section.title] ?? section.title)}
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
                          ? "bg-[var(--primary-light)] text-[var(--primary)] font-semibold"
                          : "text-[#52667A] dark:text-[#CBD5E1] hover:bg-[#F1F6FA] dark:hover:bg-[#1E3A5F] hover:text-[#102A43] dark:hover:text-[#F8FAFC]"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 -z-10 rounded-xl bg-[var(--primary-light)]"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t(NAV_LABEL_KEY[item.label] ?? item.label)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className="px-2 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
        {t("sidebar.footer")}
      </p>
    </aside>
  );
}
