import { AppShell } from "@/components/layout/app-shell";

export default function EmergencyLayout({ children }: { children: React.ReactNode }) {
  return <AppShell allow={["emergency", "dho", "hospital_admin"]}>{children}</AppShell>;
}
