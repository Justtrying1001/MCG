import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
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
  title: "Mememon TCG",
  description: "Mememon TCG demo build. Open packs, collect cards, build lineups, and compete in meme-token contests.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Mememon TCG",
    title: "Mememon TCG",
    description: "Mememon TCG demo build. Open packs, collect cards, build lineups, and compete in meme-token contests.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mememon TCG",
    description: "Mememon TCG demo build. Open packs, collect cards, build lineups, and compete in meme-token contests.",
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
        <RootProviders>{children}</RootProviders>
        <Analytics />
      </body>
    </html>
  );
}
