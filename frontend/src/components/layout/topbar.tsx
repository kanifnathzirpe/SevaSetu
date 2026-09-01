"use client";

import { LogOut, Menu, Search, Siren } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/nav";

export function Topbar({ user, onMenu }: { user: AuthUser; onMenu: () => void }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [query, setQuery] = React.useState("");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_78%,transparent)] px-4 backdrop-blur-xl">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
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
          placeholder="Search hospitals, doctors, patients…"
          className="pl-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <Button asChild variant="danger" size="sm" className="hidden sm:inline-flex">
          <Link href={user.role === "emergency" ? "/emergency" : "/patient/emergency"}>
            <Siren className="h-4 w-4" /> SOS
          </Link>
        </Button>
        <NotificationBell />
        <ThemeToggle />
        <div className="ml-1 flex items-center gap-2 rounded-xl border border-[var(--border)] py-1 pl-1 pr-2">
          <Avatar name={user.full_name} size="sm" />
          <div className="hidden leading-tight sm:block">
            <p className="max-w-32 truncate text-xs font-semibold">{user.full_name}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => logout()} aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
