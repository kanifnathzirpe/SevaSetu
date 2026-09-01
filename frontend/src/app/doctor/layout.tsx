import { AppShell } from "@/components/layout/app-shell";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <AppShell allow={["doctor"]}>{children}</AppShell>;
}
