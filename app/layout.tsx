import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { Barlow_Condensed, DM_Mono, Inter, JetBrains_Mono, Lora, Rajdhani } from "next/font/google";
import { ensureContestLifecycleSchedulerStarted } from "@/lib/domain/contests/lifecycle-scheduler";
import "./globals.css";
import "./design-system.css";
import "../styles/tokens.css";
import "../styles/semantic.css";
import "../styles/motion.css";
import "../styles/layout.css";
import "../styles/components.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-barlow-condensed",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-dm-mono",
});

const lora = Lora({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400"],
  variable: "--font-lora",
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
    <html lang="en">
      <body className={`${barlowCondensed.variable} ${inter.variable} ${jetBrainsMono.variable} ${rajdhani.variable} ${dmMono.variable} ${lora.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
