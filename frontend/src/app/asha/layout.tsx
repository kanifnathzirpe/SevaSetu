import { AppShell } from "@/components/layout/app-shell";

export default function AshaLayout({ children }: { children: React.ReactNode }) {
  return <AppShell allow={["asha"]}>{children}</AppShell>;
}
