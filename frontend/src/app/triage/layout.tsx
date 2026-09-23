import { AppShell } from "@/components/layout/app-shell";

export default function TriageLayout({ children }: { children: React.ReactNode }) {
  return <AppShell allow={["patient", "asha", "doctor"]}>{children}</AppShell>;
}
