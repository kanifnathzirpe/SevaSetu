"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Paperclip, Plus, Search, Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ChatContact, ChatMessage, ChatThread } from "@/lib/types";
import { cn, initials, relativeTime, titleCase } from "@/lib/utils";

function NewConversationDialog({ onCreated }: { onCreated: (threadId: number) => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["chat", "contacts"],
    queryFn: () => api.get<ChatContact[]>("/api/v1/chat/contacts"),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: (contact: ChatContact) =>
      api.post<ChatThread>("/api/v1/chat/threads", {
        participant_id: contact.id,
        subject: `Conversation with ${contact.full_name}`,
      }),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
      onCreated(thread.id);
      setOpen(false);
      toast.success("Conversation opened");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = contacts.filter((contact) =>
    contact.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
          <DialogDescription>Message a doctor, ASHA worker or patient from your care network.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" className="pl-9" />
        </div>
        <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto">
          {filtered.map((contact) => (
            <button
              key={contact.id}
              onClick={() => create.mutate(contact)}
              className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-left transition-colors hover:border-[var(--primary)]"
            >
              <Avatar name={contact.full_name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{contact.full_name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {titleCase(contact.role)} · {contact.locality}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const { data: threads = [] } = useQuery({
    queryKey: ["chat", "threads"],
    queryFn: () => api.get<ChatThread[]>("/api/v1/chat/threads"),
    refetchInterval: 20_000,
  });

  React.useEffect(() => {
    if (activeId === null && threads.length > 0) setActiveId(threads[0].id);
  }, [threads, activeId]);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat", "messages", activeId],
    queryFn: () => api.get<ChatMessage[]>(`/api/v1/chat/threads/${activeId}/messages`),
    enabled: activeId !== null,
    refetchInterval: 10_000,
  });

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: (body: string) => api.post<ChatMessage>(`/api/v1/chat/threads/${activeId}/messages`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const active = threads.find((thread) => thread.id === activeId);

  return (
    <>
      <PageHeader
        title="Messages"
        description="Secure conversations between patients, ASHA workers and medical officers"
        actions={<NewConversationDialog onCreated={setActiveId} />}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-[70vh] overflow-hidden">
          <CardContent className="h-full overflow-y-auto p-2">
            {threads.length === 0 ? (
              <EmptyState icon={MessageSquare} title="No conversations" description="Start a new chat to begin." />
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveId(thread.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors",
                    thread.id === activeId ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]" : "hover:bg-[var(--muted)]"
                  )}
                >
                  <Avatar name={thread.other_party_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{thread.other_party_name}</p>
                      {thread.unread_count > 0 ? <Badge tone="danger">{thread.unread_count}</Badge> : null}
                    </div>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      {thread.last_message || thread.subject}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                      {titleCase(thread.other_party_role)} · {relativeTime(thread.last_message_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex h-[70vh] flex-col">
          {active ? (
            <>
              <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
                <Avatar name={active.other_party_name} size="sm" />
                <div>
                  <p className="text-sm font-semibold">{active.other_party_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {titleCase(active.other_party_role)} · {typing ? "typing…" : "online"}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message) => {
                  const mine = message.sender_id === user?.id;
                  return (
                    <div key={message.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                      {!mine ? (
                        <span className="mt-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[10px] font-bold">
                          {initials(message.sender_name)}
                        </span>
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                          mine ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] bg-[var(--muted)]"
                        )}
                      >
                        <p className="whitespace-pre-line">{message.body}</p>
                        <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-[var(--muted-foreground)]")}>
                          {relativeTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form
                className="flex items-center gap-2 border-t border-[var(--border)] p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!draft.trim()) return;
                  send.mutate(draft.trim());
                  setDraft("");
                  setTyping(false);
                }}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Attach file"
                  onClick={() => toast.info("Attachments are enabled for verified facilities only")}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setTyping(event.target.value.length > 0);
                  }}
                  placeholder="Type a message…"
                />
                <Button type="submit" size="icon" loading={send.isPending} aria-label="Send message">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState icon={MessageSquare} title="Select a conversation" description="Choose a chat from the list to start messaging." />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
