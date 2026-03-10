import Link from "next/link";
import { Suspense } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { AuthErrorNotice } from "@/components/auth/AuthErrorNotice";

export default function HomePage() {
  return (
    <SiteShell>
      {/* ── Hero ── */}
      <section className="hero-wrap">
        <div className="hero-bg-glow" />
        <div className="hero-grid-lines" />

        <div className="hero-body">
          <Suspense fallback={null}>
            <AuthErrorNotice />
          </Suspense>
          <p className="eyebrow">Premium Dark-Modern TCG</p>
          <h1 className="hero-title">
            Own the rarest.<br />
            <span className="accent">Chase the drop.</span><br />
            Dominate.
          </h1>
          <p className="hero-desc">
            MCG is a premium collectible card game where every pull carries weight.
            Open sealed boosters, build high-synergy rosters, and compete
            for the rarest cards in the set.
          </p>
          <div className="cta-row">
            <Link href="/packs" className="btn btn-primary btn-lg">Open a pack</Link>
            <Link href="/collection" className="btn btn-ghost btn-lg">My collection</Link>
          </div>
          <div className="hero-pills">
            <span className="hero-pill">6-tier rarity system</span>
            <span className="hero-pill">Sealed pack ritual</span>
            <span className="hero-pill">Contest progression</span>
          </div>
        </div>

        <div className="hero-cards-wrap">
          <div className="hero-card hero-card-1">
            <span className="hero-card-name">Genesis Pepe</span>
            <span className="hero-card-rarity" style={{ color: "var(--rarity-legendary)" }}>Legendary · S01</span>
            <div className="hero-card-art">🐸</div>
          </div>
          <div className="hero-card hero-card-2">
            <span className="hero-card-name">Bull Matrix</span>
            <span className="hero-card-rarity" style={{ color: "var(--rarity-epic)" }}>Epic · S01</span>
            <div className="hero-card-art">🐂</div>
          </div>
          <div className="hero-card hero-card-3">
            <span className="hero-card-name">Signal Drop</span>
            <span className="hero-card-rarity" style={{ color: "var(--rarity-rare)" }}>Rare · S01</span>
            <div className="hero-card-art">◈</div>
          </div>
        </div>
      </section>

      {/* ── Feature panels ── */}
      <div className="feature-grid">
        <article className="feature-panel">
          <div className="feature-panel-icon">◈</div>
          <h3>Crack the seal</h3>
          <p>
            Sealed booster ritual — five face-down cards, revealed one by one.
            Every flip is a moment. Every pull stays in your collection forever.
          </p>
        </article>
        <article className="feature-panel">
          <div className="feature-panel-icon">▦</div>
          <h3>Build your binder</h3>
          <p>
            Six rarity tiers. Foil variants. Full-art chases.
            Every card is an object worth possessing — not just a stat block.
          </p>
        </article>
        <article className="feature-panel">
          <div className="feature-panel-icon">🏆</div>
          <h3>Enter contests</h3>
          <p>
            Build your lineup from owned cards, enter active contests,
            and climb settled leaderboards with measurable progression.
          </p>
        </article>
      </div>
    </SiteShell>
  );
}
