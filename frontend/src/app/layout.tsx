import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "SevaSetu AI — Pune District Public Health Platform",
  description:
    "SevaSetu AI connects patients, ASHA workers, doctors and district health officers across Pune district with AI-assisted triage, telemedicine, emergency response and real-time health surveillance.",
  keywords: ["public health", "Pune", "telemedicine", "ASHA", "PHC", "Smart India Hackathon"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d9488" },
    { media: "(prefers-color-scheme: dark)", color: "#04161a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
