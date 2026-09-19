import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "SevaSetu",
  description:
    "SevaSetu brings quality healthcare to rural and underserved areas, connecting patients, ASHA workers, doctors and health officers with AI-assisted triage, telemedicine, emergency response and real-time health surveillance.",
  keywords: ["public health", "telemedicine", "ASHA", "PHC"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#123B6D" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1E36" },
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
