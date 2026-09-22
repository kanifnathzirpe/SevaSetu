"use client";

import { Baby, User } from "lucide-react";
import * as React from "react";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Child } from "@/lib/types";

interface FamilyMemberSelectorProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  suggestedName?: string;
}

export function FamilyMemberSelector({ selectedId, onSelect, suggestedName }: FamilyMemberSelectorProps) {
  const { data: children = [], isLoading } = useQuery({
    queryKey: ["patient", "children"],
    queryFn: () => api.get<Child[]>("/api/v1/patient/children"),
  });

  // Auto-select based on suggested name if available
  React.useEffect(() => {
    if (suggestedName && children.length > 0) {
      const match = children.find(
        (child) => child.name.toLowerCase().includes(suggestedName.toLowerCase())
      );
      if (match && selectedId === null) {
        onSelect(match.id);
      }
    }
  }, [suggestedName, children, selectedId, onSelect]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Who is this document for?</p>
        <div className="space-y-2">
          <div className="h-12 rounded-lg bg-[var(--muted)] animate-pulse" />
          <div className="h-12 rounded-lg bg-[var(--muted)] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Who is this document for?</p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
            selectedId === null
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-[var(--border)] hover:bg-[var(--muted)]"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-white">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">Myself</p>
            <p className="text-xs text-[var(--muted-foreground)]">Primary patient</p>
          </div>
        </button>

        {children.map((child) => (
          <button
            key={child.id}
            type="button"
            onClick={() => onSelect(child.id)}
            className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
              selectedId === child.id
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)] hover:bg-[var(--muted)]"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white">
              <Baby className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">{child.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {child.gender} · {child.age_months} months old
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}