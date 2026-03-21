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
  const { isStartingLogin, loginWithPrivy, ready } = usePrivyLogin();

  return (
    <section className="home-hero-landing">
      <div className="home-hero-glow" aria-hidden="true" />
      <div className="home-hero-glow home-hero-glow-2" aria-hidden="true" />

      <div className="home-hero-body">
        {/* Left — copy */}
        <div className="home-hero-content">
          <p className="home-hero-eyebrow">Set 1 · Genesis · Live Now</p>
          <h1 className="home-hero-headline">
            COLLECT.<br />
            COMPETE.<br />
            <span className="home-hero-headline-accent">WIN.</span>
          </h1>
          <p className="home-hero-subline">
            MCG is a trading card game built on meme tokens.<br />
            Collect across {GAME_CONFIG.GENESIS_SET.TOKEN_COUNT} Genesis tokens, build rosters, let the market decide.
          </p>
          <div className="home-hero-ctas">
            <button
              className="home-hero-cta-primary"
              disabled={!ready || isStartingLogin}
              onClick={() => void loginWithPrivy()}
            >
              <svg width="16" height="14" viewBox="0 0 300 271" fill="currentColor" aria-hidden="true" style={{flexShrink:0}}>
                <path d="M236 0h46L181 115l118 156h-92l-72-94-82 94H7l107-122L1 0h94l65 86L236 0zm-16 244h25L80 26H54l166 218z"/>
              </svg>
              CONNECT
            </button>
            <a
              href="https://mcg-2.gitbook.io/mcg/"
              target="_blank"
              rel="noopener noreferrer"
              className="home-hero-cta-secondary"
            >
              READ THE DOCS <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        {/* Right — real token cards */}
        <div className="home-hero-cards-float" aria-hidden="true">
          {HERO_CARDS.map((card) => (
            <div key={card.name} className={`home-float-card ${card.cls}`}>
              <div className="home-float-card-art">
                <Image
                  src={card.img}
                  alt={card.label}
                  fill
                  sizes="160px"
                  className="home-float-card-img"
                  unoptimized
                />
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
    </section>
  );
}
