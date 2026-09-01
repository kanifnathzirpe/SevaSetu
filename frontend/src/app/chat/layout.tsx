import { AppShell } from "@/components/layout/app-shell";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <AppShell allow={["patient", "asha", "doctor", "hospital_admin", "dho", "emergency"]}>{children}</AppShell>;
}
