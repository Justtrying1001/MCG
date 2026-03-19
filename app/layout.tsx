import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SessionProvider } from "@/components/session/SessionProvider";
import { ensureContestLifecycleSchedulerStarted } from "@/lib/domain/contests/lifecycle-scheduler";
import "./globals.css";
import "../styles/tokens.css";
import "../styles/semantic.css";
import "../styles/motion.css";
import "../styles/layout.css";
import "../styles/components.css";

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
      <body>
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
