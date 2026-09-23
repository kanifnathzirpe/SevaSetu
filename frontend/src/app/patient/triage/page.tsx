"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PatientTriageRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/triage");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        <p className="text-sm text-[var(--muted-foreground)]">Redirecting to Digital Triage…</p>
      </div>
    </div>
  );
}
