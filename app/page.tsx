import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";

export default function HomePage() {
  return (
    <SiteShell>
      {/* ── Hero ── */}
      <section className="hero-wrap">
        <div className="hero-bg-glow" />
        <div className="hero-grid-lines" />

        <div className="hero-body">
          <p className="eyebrow">Next-Gen Crypto TCG</p>
          <h1 className="hero-title">
            Own the rarest memes.<br />
            <span className="accent">Build unstoppable</span><br />
            lineups.
          </h1>
          <p className="hero-desc">
            MCG is a collectible strategy loop where every card pull matters.
            Crack open boosters, craft high-synergy squads, and grind PvE
            ladders for rewards and prestige.
          </p>
          <div className="cta-row">
            <Link href="/packs" className="btn btn-primary btn-lg">Open a booster</Link>
            <Link href="/collection" className="btn btn-ghost btn-lg">Explore collection</Link>
          </div>
          <div className="hero-pills">
            <span className="hero-pill">Dynamic rarity layers</span>
            <span className="hero-pill">Competitive PvE</span>
            <span className="hero-pill">Web3-native identity</span>
          </div>
        </div>

        <div className="hero-cards-wrap">
          <div className="hero-card hero-card-1">
            <span className="hero-card-name">Genesis Pepe</span>
            <span className="hero-card-rarity">Legendary · Meme Core</span>
            <div className="hero-card-art">🐸</div>
          </div>
          <div className="hero-card hero-card-2">
            <span className="hero-card-name">Bull Matrix</span>
            <span className="hero-card-rarity">Epic · Alpha Faction</span>
            <div className="hero-card-art">🐂</div>
          </div>
          <div className="hero-card hero-card-3">
            <span className="hero-card-name">Degen Pulse</span>
            <span className="hero-card-rarity">Rare · Neon Syndicate</span>
            <div className="hero-card-art">⚡</div>
          </div>
        </div>
      </section>

      {/* ── Feature panels ── */}
      <div className="feature-grid">
        <article className="feature-panel">
          <div className="feature-panel-icon">◈</div>
          <h3>Open packs, chase rarity</h3>
          <p>
            Weighted drop tables keep progression exciting while preserving
            long-term chase value for the rarest archetypes.
          </p>
        </article>
        <article className="feature-panel">
          <div className="feature-panel-icon">▦</div>
          <h3>Build your collection</h3>
          <p>
            High-contrast frames, focused art zones, rarity glow, and premium
            readability — every card feels like an asset.
          </p>
        </article>
        <article className="feature-panel">
          <div className="feature-panel-icon">⚔</div>
          <h3>Grind the PvE ladder</h3>
          <p>
            Open packs → tune your squad → run encounters → gain XP and
            reinvest into stronger, synergy-first lineups.
          </p>
        </article>
      </div>
    </SiteShell>
  );
}
