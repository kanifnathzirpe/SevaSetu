import {
  Activity,
  Ambulance,
  ArrowRightLeft,
  Baby,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  Home,
  Hospital,
  type LucideIcon,
  MapPinned,
  MessageSquare,
  Package,
  Pill,
  Radar,
  ShieldCheck,
  Siren,
  Stethoscope,
  Syringe,
  Users,
  UserRound,
  Video,
} from "lucide-react";

import type { Role } from "@/lib/api";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  patient: [
    {
      title: "Care",
      items: [
        { label: "Dashboard", href: "/patient", icon: Home },
        { label: "Appointments", href: "/patient/appointments", icon: CalendarDays },
        { label: "Nearby Hospitals", href: "/patient/hospitals", icon: Hospital },
        { label: "Emergency SOS", href: "/patient/emergency", icon: Siren },
      ],
    },
    {
      title: "Connect",
      items: [
        { label: "Chat", href: "/chat", icon: MessageSquare },
        { label: "Video Consults", href: "/patient/video", icon: Video },
      ],
    },
    {
      title: "Records",
      items: [
        { label: "Medical History", href: "/patient/history", icon: ClipboardList },
        { label: "Reports", href: "/patient/reports", icon: FileText },
        { label: "Prescriptions", href: "/patient/prescriptions", icon: Pill },
        { label: "Govt Schemes", href: "/patient/schemes", icon: ShieldCheck },
        { label: "Health Card", href: "/patient/health-card", icon: CreditCard },
        { label: "Profile", href: "/patient/profile", icon: UserRound },
      ],
    },

    {
      title: "Wellness",
      items: [
        { label: "Medicine Reminders", href: "/patient/reminders", icon: Bell },
        { label: "Vaccinations", href: "/patient/vaccinations", icon: Syringe },
        { label: "Pregnancy", href: "/patient/pregnancy", icon: Baby },
        { label: "Nutrition", href: "/patient/nutrition", icon: HeartPulse },
      ],
    },
  ],
  asha: [
    {
      title: "Field work",
      items: [
        { label: "Dashboard", href: "/asha", icon: Home },
        { label: "Households", href: "/asha/households", icon: Users },
        { label: "Visit Planner", href: "/asha/visits", icon: CalendarDays },
        { label: "Daily Targets", href: "/asha/targets", icon: BarChart3 },
      ],
    },
    {
      title: "Programmes",
      items: [
        { label: "Pregnancies", href: "/asha/pregnancies", icon: Baby },
        { label: "Child Health", href: "/asha/children", icon: Syringe },
        { label: "Referrals", href: "/asha/referrals", icon: FileText },
        { label: "My Patients", href: "/asha/patients", icon: UserRound },
      ],
    },
    { title: "Connect", items: [{ label: "Chat", href: "/chat", icon: MessageSquare }] },
  ],
  doctor: [
    {
      title: "Clinic",
      items: [
        { label: "Dashboard", href: "/doctor", icon: Home },
        { label: "Appointments", href: "/doctor/appointments", icon: CalendarDays },
        { label: "Queue", href: "/doctor/queue", icon: Users },
        { label: "Referrals", href: "/doctor/referrals", icon: ArrowRightLeft },
        { label: "Patients", href: "/doctor/patients", icon: UserRound },
      ],
    },
    {
      title: "Clinical tools",
      items: [
        { label: "Prescriptions", href: "/doctor/prescriptions", icon: Pill },
        { label: "Lab Requests", href: "/doctor/lab-requests", icon: FlaskConical },
        { label: "Medicine Index", href: "/doctor/medicines", icon: Package },
      ],
    },
    { title: "Connect", items: [{ label: "Chat", href: "/chat", icon: MessageSquare }] },
  ],
  hospital_admin: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: Home },
        { label: "Hospital Reports", href: "/admin/reports", icon: FileText },
      ],
    },
    {
      title: "Facility",
      items: [
        { label: "Hospitals", href: "/admin/hospitals", icon: Building2 },
        { label: "Doctors", href: "/admin/doctors", icon: Stethoscope },
        { label: "Ambulances", href: "/admin/ambulances", icon: Ambulance },
      ],
    },
    {
      title: "Programmes",
      items: [
        { label: "Medicine Inventory", href: "/admin/inventory", icon: Package },
        { label: "Vaccination", href: "/admin/vaccination", icon: Syringe },
      ],
    },
    {
      title: "Connect",
      items: [
        { label: "Chat", href: "/chat", icon: MessageSquare },
      ],
    },
  ],
  dho: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: Home },
        { label: "District Reports", href: "/admin/reports", icon: FileText },
      ],
    },
    {
      title: "Network",
      items: [
        { label: "Hospitals", href: "/admin/hospitals", icon: Building2 },
        { label: "Doctors", href: "/admin/doctors", icon: Stethoscope },
        { label: "ASHA Workers", href: "/admin/asha-workers", icon: Users },
        { label: "Ambulances", href: "/admin/ambulances", icon: Ambulance },
      ],
    },
    {
      title: "Programmes",
      items: [
        { label: "Medicine Inventory", href: "/admin/inventory", icon: Package },
        { label: "Vaccination", href: "/admin/vaccination", icon: Syringe },
        { label: "Disease Heatmap", href: "/admin/heatmap", icon: Radar },
      ],
    },
    {
      title: "Connect",
      items: [
        { label: "Chat", href: "/chat", icon: MessageSquare },
      ],
    },
  ],
  emergency: [
    {
      title: "Control room",
      items: [
        { label: "Live Console", href: "/emergency", icon: Siren },
        { label: "Ambulance Map", href: "/emergency/map", icon: MapPinned },
        { label: "Case History", href: "/emergency/cases", icon: ClipboardList },
      ],
    },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  patient: "Patient",
  asha: "ASHA Worker",
  doctor: "Doctor",
  hospital_admin: "Hospital Admin",
  dho: "District Health Officer",
  emergency: "Emergency Response",
};
