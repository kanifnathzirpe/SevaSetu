"use client";

import { Globe, LogOut, Menu, Moon, Search, Siren, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";

import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n, LOCALES } from "@/lib/i18n";

export function Topbar({ user, onMenu }: { user: AuthUser; onMenu: () => void }) {
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => setMounted(true), []);

  /* ---- Profile dropdown ---- */
  const [profileOpen, setProfileOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setProfileOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setProfileOpen(false), 200);
  };
  React.useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-profile-menu]")) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  /* ---- Language dropdown ---- */
  const [langOpen, setLangOpen] = React.useState(false);
  const langCloseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const openLang = () => {
    if (langCloseTimer.current) clearTimeout(langCloseTimer.current);
    setLangOpen(true);
  };
  const scheduleLangClose = () => {
    langCloseTimer.current = setTimeout(() => setLangOpen(false), 200);
  };
  React.useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-lang-menu]")) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 sm:gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_78%,transparent)] px-3 sm:px-4 backdrop-blur-xl">
      <Button variant="ghost" size="icon" className="lg:hidden touch-target shrink-0" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <form
        className="relative hidden flex-1 max-w-md md:block"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("topbar.search")}
          className="pl-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <Button asChild variant="danger" size="sm" className="hidden sm:inline-flex">
          <Link href={user.role === "emergency" ? "/emergency" : "/patient/emergency"}>
            <Siren className="h-4 w-4" /> {t("topbar.sos")}
          </Link>
        </Button>
        <NotificationBell />

        {/* ---- Language switcher ---- */}
        <div
          className="relative"
          data-lang-menu
          onMouseEnter={openLang}
          onMouseLeave={scheduleLangClose}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLangOpen((p) => !p)}
            aria-label={t("language")}
          >
            <Globe className="h-4 w-4" />
          </Button>

          {langOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 origin-top-right animate-[profileDropIn_0.18s_ease-out] rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-xl">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {t("language")}
              </p>
              {LOCALES.map((loc) => (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => {
                    setLocale(loc.code);
                    setLangOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                    locale === loc.code
                      ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)] font-medium"
                      : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--muted)] text-xs font-bold">
                    {loc.flag}
                  </span>
                  <span className="flex-1 text-left">{loc.label}</span>
                  {locale === loc.code && (
                    <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---- Profile chip with hover dropdown ---- */}
        <div
          className="relative ml-1"
          data-profile-menu
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <button
            type="button"
            onClick={() => setProfileOpen((p) => !p)}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] py-1 pl-1 pr-2 transition-colors hover:bg-[var(--muted)] cursor-pointer"
          >
            <Avatar name={user.full_name} size="sm" />
            <div className="hidden leading-tight sm:block text-left">
              <p className="max-w-32 truncate text-xs font-semibold">{user.full_name}</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                {t(`role.${user.role}`)}
              </p>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 origin-top-right animate-[profileDropIn_0.18s_ease-out] rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-xl">
              <div className="border-b border-[var(--border)] px-3 py-2.5 mb-1">
                <p className="text-sm font-semibold truncate">{user.full_name}</p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">
                  {t(`role.${user.role}`)}
                </p>
              </div>

              <Link
                href="/patient/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
              >
                <User className="h-4 w-4 text-[var(--muted-foreground)]" />
                {t("topbar.viewProfile")}
              </Link>

              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] cursor-pointer"
              >
                <Moon className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span className="flex-1 text-left">{t("topbar.darkMode")}</span>
                <span
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    mounted && theme === "dark" ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                      mounted && theme === "dark" ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>

              <div className="my-1 border-t border-[var(--border)]" />

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {t("topbar.signOut")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
