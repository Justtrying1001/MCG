"use client";

import Image from "next/image";
import { usePrivyLogin } from "@/components/auth/usePrivyLogin";
import { GAME_CONFIG } from "@/lib/game-config";

const HERO_CARDS = [
  {
    name: "PEPE",
    label: "Pepe",
    rarity: "Legendary",
    symbol: "$PEPE",
    img: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528776",
    cls: "home-float-card--legendary",
  },
  {
    name: "WIF",
    label: "dogwifhat",
    rarity: "Epic",
    symbol: "$WIF",
    img: "https://coin-images.coingecko.com/coins/images/33566/large/dogwifhat.jpg?1702499428",
    cls: "home-float-card--epic",
  },
  {
    name: "BONK",
    label: "Bonk",
    rarity: "Rare",
    symbol: "$BONK",
    img: "https://coin-images.coingecko.com/coins/images/28600/large/bonk.jpg?1696527587",
    cls: "home-float-card--rare",
  },
  {
    name: "DOGE",
    label: "Dogecoin",
    rarity: "Uncommon",
    symbol: "$DOGE",
    img: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409",
    cls: "home-float-card--uncommon",
  },
];

export function HomeHeroLanding() {
  const { loginWithPrivy } = usePrivyLogin();

  return (
    <section className="home-hero-landing">
      <div className="home-hero-glow" aria-hidden="true" />
      <div className="home-hero-glow home-hero-glow-2" aria-hidden="true" />
      <div className="home-hero-grid">
        <div className="home-hero-content">
          <div className="home-hero-kicker-wrap">
            <p className="home-hero-eyebrow">Season 1 · Genesis pack available</p>
          </div>
          <h1 className="home-hero-headline">
            Build your edge with<br />
            premium <span className="home-hero-headline-accent">meme cards</span>
          </h1>
          <p className="home-hero-subline">
            Open packs across {GAME_CONFIG.GENESIS_SET.TOKEN_COUNT} Genesis tokens, build your collection, and bring your best cards into live contests.
          </p>
          <div className="home-hero-ctas">
            <button className="home-hero-cta-primary" onClick={() => loginWithPrivy()}>
              <svg width="16" height="14" viewBox="0 0 300 271" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M236 0h46L181 115l118 156h-92l-72-94-82 94H7l107-122L1 0h94l65 86L236 0zm-16 244h25L80 26H54l166 218z" />
              </svg>
              Play for free
            </button>
            <a href="https://mcg-2.gitbook.io/mcg/" target="_blank" rel="noopener noreferrer" className="home-hero-cta-secondary">
              Read the docs <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="home-hero-signal-row" aria-label="Core game promises">
            <span className="home-hero-signal-pill">Card-first gameplay</span>
            <span className="home-hero-signal-pill">Live contests</span>
            <span className="home-hero-signal-pill">Persistent collection</span>
          </div>
          <p className="home-hero-cta-note">Start in seconds, keep your progress, and carry the same identity across collection and competition.</p>
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-hero-stage">
            <div className="home-hero-stage-copy">
              <span>Genesis pack</span>
              <strong>4 featured cards</strong>
              <p>Each featured card drops into the same collection and contest loop you use in the app.</p>
            </div>
            <div className="home-hero-card-grid">
              {HERO_CARDS.map((card) => (
                <div key={card.name} className={`home-float-card ${card.cls}`}>
                  <div className="home-float-card-art">
                    <Image src={card.img} alt={card.label} fill sizes="(max-width: 768px) 220px, 260px" className="home-float-card-img" unoptimized />
                    <div className="home-float-card-art-overlay" />
                  </div>
                  <div className="home-float-card-body">
                    <span className="home-float-card-rarity">{card.rarity}</span>
                    <span className="home-float-card-name">{card.label}</span>
                    <span className="home-float-card-symbol">{card.symbol}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
