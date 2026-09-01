import { AppShell } from "@/components/layout/app-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell allow={["hospital_admin", "dho"]}>{children}</AppShell>;
}
