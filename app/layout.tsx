import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { AppBackground } from "@/components/layout/AppBackground";
import { RootProviders } from "@/components/providers/RootProviders";
import { ensureContestLifecycleSchedulerStarted } from "@/lib/domain/contests/lifecycle-scheduler";
import { getCanonicalSiteUrl } from "@/lib/site-url";
import "./globals.css";
import "../styles/tokens.css";
import "../styles/semantic.css";
import "../styles/motion.css";
import "../styles/layout.css";
import "../styles/components.css";

export const metadata: Metadata = {
  metadataBase: getCanonicalSiteUrl(),
  title: "MCG · Meme Card Game",
  description: "Premium dark-modern TCG collectible. Open packs, build your roster, dominate the ladder.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MCG · Meme Card Game",
    title: "MCG · Meme Card Game",
    description: "Premium dark-modern TCG collectible. Open packs, build your roster, dominate the ladder.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MCG · Meme Card Game",
    description: "Premium dark-modern TCG collectible. Open packs, build your roster, dominate the ladder.",
  },
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
        <AppBackground />
        <RootProviders>{children}</RootProviders>
        <Analytics />
      </body>
    </html>
  );
}
