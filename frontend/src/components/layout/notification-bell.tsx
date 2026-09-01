"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-[var(--info)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  critical: "bg-[var(--danger)]",
};

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationItem[]>("/api/v1/notifications?limit=20"),
    refetchInterval: 60_000,
  });

  const unread = data.filter((item) => !item.is_read).length;

  const markAll = useMutation({
    mutationFn: () => api.post("/api/v1/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  const markOne = useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  React.useEffect(() => {
    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Button variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <button
                onClick={() => markAll.mutate()}
                className="flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {data.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                  No notifications yet.
                </p>
              )}
              {data.map((item) => {
                const content = (
                  <div
                    className={cn(
                      "flex gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors hover:bg-[var(--muted)]",
                      !item.is_read && "bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]"
                    )}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[item.severity] ?? "bg-[var(--muted-foreground)]")} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{item.body}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                        {relativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                );
                return item.action_url ? (
                  <Link
                    key={item.id}
                    href={item.action_url}
                    onClick={() => {
                      if (!item.is_read) markOne.mutate(item.id);
                      setOpen(false);
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : (
                  <button key={item.id} onClick={() => markOne.mutate(item.id)} className="block w-full">
                    {content}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
