"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import * as React from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { SymptomChatbot } from "@/components/layout/symptom-chatbot";
import { Topbar } from "@/components/layout/topbar";
import type { Role } from "@/lib/api";
import { ROLE_HOME, useAuth } from "@/lib/auth";

export function AppShell({ children, allow }: { children: React.ReactNode; allow: Role[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (!allow.includes(user.role)) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [user, loading, allow, router]);

  if (loading || !user || !allow.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar user={user} />
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:hidden shadow-2xl"
            >
              <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 pb-24 lg:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-auto w-full max-w-7xl overflow-hidden"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile bottom navigation bar */}
      <BottomNav user={user} onOpenMenu={() => setMobileOpen(true)} />

      {/* Floating symptom-checker chatbot - only visible for patients */}
      {user.role === "patient" && <SymptomChatbot />}
    </div>
  );
}
