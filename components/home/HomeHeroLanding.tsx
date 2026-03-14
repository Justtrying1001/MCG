"use client";

import { useSession } from "@/components/useSession";

export function HomeHeroLanding() {
  const { startGuest } = useSession();

  const connectWithX = () => {
    window.location.href = "/api/auth/x/start";
  };

  return (
    <section className="home-hero-landing">
      {/* abstract glow backdrop */}
      <div className="home-hero-glow" aria-hidden="true" />
      <div className="home-hero-glow home-hero-glow-2" aria-hidden="true" />

      <div className="home-hero-body">
        <div className="home-hero-content">
          <p className="mcg-eyebrow home-hero-eyebrow">Set 1 · Genesis · Live Now</p>
          <h1 className="home-hero-headline">
            COLLECT.<br />
            COMPETE.<br />
            WIN.
          </h1>
          <p className="home-hero-subline">
            MCG is a trading card game built on meme tokens.
            Pull cards, build rosters, let the market decide.
          </p>
          <div className="home-hero-ctas">
            <button
              className="home-hero-cta-primary"
              onClick={connectWithX}
            >
              CONNECT WALLET
            </button>
            <a
              href="https://mcg-2.gitbook.io/untitled/"
              target="_blank"
              rel="noopener noreferrer"
              className="home-hero-cta-secondary"
            >
              READ THE DOCS <span aria-hidden="true">↗</span>
            </a>
          </div>
          <button className="home-hero-guest-link" onClick={startGuest}>
            Try as guest →
          </button>
        </div>

        {/* floating card visuals */}
        <div className="home-hero-cards-float" aria-hidden="true">
          <div className="home-float-card home-float-card--legendary">
            <div className="home-float-card-shine" />
            <div className="home-float-card-body">
              <div className="home-float-card-rarity">Legendary</div>
              <div className="home-float-card-name">Genesis Pepe</div>
              <div className="home-float-card-type">Full Art</div>
            </div>
          </div>
          <div className="home-float-card home-float-card--epic">
            <div className="home-float-card-shine" />
            <div className="home-float-card-body">
              <div className="home-float-card-rarity">Epic</div>
              <div className="home-float-card-name">Bull Matrix</div>
              <div className="home-float-card-type">Holo</div>
            </div>
          </div>
          <div className="home-float-card home-float-card--rare">
            <div className="home-float-card-shine" />
            <div className="home-float-card-body">
              <div className="home-float-card-rarity">Rare</div>
              <div className="home-float-card-name">Moon Cat</div>
              <div className="home-float-card-type">Reverse</div>
            </div>
          </div>
          <div className="home-float-card home-float-card--uncommon">
            <div className="home-float-card-shine" />
            <div className="home-float-card-body">
              <div className="home-float-card-rarity">Uncommon</div>
              <div className="home-float-card-name">Turbo Doge</div>
              <div className="home-float-card-type">Base</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
