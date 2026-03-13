import Link from "next/link";
import { Suspense } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { AuthErrorNotice } from "@/components/auth/AuthErrorNotice";

export default function HomePage() {
  return (
    <SiteShell>
      <section className="hero-wrap">
        <div className="hero-bg-glow" />
        <div className="hero-grid-lines" />

        <div className="hero-body">
          <Suspense fallback={null}>
            <AuthErrorNotice />
          </Suspense>
          <p className="eyebrow">A collectible-first card game</p>
          <h1 className="hero-title">
            Open your packs,<br />
            <span className="accent">build your dream binder</span><br />
            and battle through contests.
          </h1>
          <p className="hero-desc">
            MCG is built around card collection, lineup strategy, and seasonal contest progression.
            Every pack matters, every card can become part of your next competitive run.
          </p>
          <div className="cta-row">
            <Link href="/packs" className="btn btn-primary btn-lg">Open a pack</Link>
            <Link href="/collection" className="btn btn-ghost btn-lg">Browse collection</Link>
          </div>
          <div className="hero-pills">
            <span className="hero-pill">Pack reveals</span>
            <span className="hero-pill">Collector filters</span>
            <span className="hero-pill">Contests + rewards</span>
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

      <div className="feature-grid">
        <article className="feature-panel">
          <div className="feature-panel-icon">◈</div>
          <h3>Pack opening ritual</h3>
          <p>Reveal five cards one by one, track your pulls, and immediately feed your collector progression.</p>
        </article>
        <article className="feature-panel">
          <div className="feature-panel-icon">▦</div>
          <h3>Collector-centric collection</h3>
          <p>Filter by faction, inspect rarity balance, and navigate your card library like a real binder owner.</p>
        </article>
        <article className="feature-panel">
          <div className="feature-panel-icon">🏆</div>
          <h3>Contest lineup gameplay</h3>
          <p>Pick your roster, lock your entry, and climb rankings while earning rewards through quests and milestones.</p>
        </article>
      </div>
    </SiteShell>
  );
}
