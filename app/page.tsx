import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";

export default function HomePage() {
  return (
    <SiteShell>
      <section className="hero premium-hero">
        <div className="hero-copy">
          <p className="eyebrow">NEXT-GEN CRYPTO TCG</p>
          <h2>Own the rarest memes. Build unstoppable lineups.</h2>
          <p>
            MCG is a collectible strategy loop where every card pull matters. Crack open boosters, craft high-synergy squads,
            and grind PvE ladders for rewards and prestige.
          </p>
          <div className="cta-row">
            <Link href="/packs" className="btn btn-primary">Open a booster</Link>
            <Link href="/collection" className="btn btn-ghost">Explore collection</Link>
          </div>
          <div className="kpi-strip">
            <span>Dynamic rarity layers</span>
            <span>Competitive PvE progression</span>
            <span>Web3-native identity</span>
          </div>
        </div>

        <div className="hero-cards">
          <div className="hero-card hero-card-front">
            <strong>Genesis Pepe</strong>
            <span>Legendary · Meme Core</span>
          </div>
          <div className="hero-card hero-card-mid">
            <strong>Bull Matrix</strong>
            <span>Epic · Alpha Faction</span>
          </div>
          <div className="hero-card hero-card-back">
            <strong>Degen Pulse</strong>
            <span>Rare · Neon Syndicate</span>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-panel">
          <h3>Card-first visual language</h3>
          <p>High-contrast frames, focused art zones, rarity glow, and premium game readability.</p>
        </article>
        <article className="feature-panel">
          <h3>Rewarding opening flow</h3>
          <p>Booster reveal modal + layered foil treatment to make each pull feel meaningful.</p>
        </article>
        <article className="feature-panel">
          <h3>Progression loop</h3>
          <p>Open packs → tune deck → run PvE → gain XP and reinvest into stronger squads.</p>
        </article>
      </section>
    </SiteShell>
  );
}
