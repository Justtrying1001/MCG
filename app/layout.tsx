import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { Space_Grotesk, Be_Vietnam_Pro, Plus_Jakarta_Sans } from "next/font/google";
import { RootProviders } from "@/components/providers/RootProviders";
import { ensureContestLifecycleSchedulerStarted } from "@/lib/domain/contests/lifecycle-scheduler";
import "./globals.css";
import "../styles/tokens.css";
import "../styles/semantic.css";
import "../styles/motion.css";
import "../styles/layout.css";
import "../styles/components.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-label",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MCG · Meme Card Game",
  description: "Premium dark-modern TCG collectible. Open packs, build your roster, dominate the ladder.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  ensureContestLifecycleSchedulerStarted();

  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${beVietnamPro.variable} ${plusJakartaSans.variable}`}>
      <body>
        <RootProviders>{children}</RootProviders>
        <Analytics />
      </body>
    </html>
  );
}
