"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { usePrivyLogin } from "@/components/auth/usePrivyLogin";
import { GAME_CONFIG } from "@/lib/game-config";

const HERO_CARDS = [
  {
    name: "PEPE",
    label: "Pepe Prime",
    rarity: "Legendary",
    symbol: "$PEPE",
    img: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528776",
    cls: "home-float-card--legendary",
  },
  {
    name: "WIF",
    label: "dogwifhat",
    rarity: "Mythic",
    symbol: "$WIF",
    img: "https://coin-images.coingecko.com/coins/images/33566/large/dogwifhat.jpg?1702499428",
    cls: "home-float-card--epic home-float-card--hero",
  },
  {
    name: "BONK",
    label: "Bonk Burst",
    rarity: "Rare",
    symbol: "$BONK",
    img: "https://coin-images.coingecko.com/coins/images/28600/large/bonk.jpg?1696527587",
    cls: "home-float-card--rare",
  },
];

export function HomeHeroLanding() {
  const { isStartingLogin, loginWithPrivy, ready } = usePrivyLogin();

  return (
    <section className="home-hero-landing stitch-hero-card">
      <div className="home-hero-glow" aria-hidden="true" />
      <div className="home-hero-glow home-hero-glow-2" aria-hidden="true" />
      <div className="home-hero-ring" aria-hidden="true" />

      <div className="home-hero-body">
        <div className="home-hero-content">
          <p className="home-hero-kicker">Join the fun • Genesis season live</p>
          <div className="stitch-stamp">Press start</div>
          <h1 className="home-hero-headline">
            MCG — THE <span>MEME</span>
            <br />
            CARD GAME
          </h1>
          <p className="home-hero-subline">
            Stop scrolling. Start collecting. Pull internet legends, build your
            roster across {GAME_CONFIG.GENESIS_SET.TOKEN_COUNT} meme tokens, and
            battle for leaderboard glory.
          </p>

          <div
            className="home-hero-chip-row"
            aria-label="Guest landing highlights"
          >
            <span className="mcg-chip">
              {GAME_CONFIG.GENESIS_SET.TOKEN_COUNT} meme tokens
            </span>
            <span className="mcg-chip">
              {GAME_CONFIG.GENESIS_SET.PACK_COUNT.toLocaleString()} planned
              packs
            </span>
            <span className="mcg-chip">Guest preview ready</span>
          </div>

          <div className="home-hero-ctas">
            <Button
              className="btn-lg home-hero-cta-primary"
              disabled={!ready || isStartingLogin}
              onClick={() => void loginWithPrivy()}
              icon={
                <svg
                  width="16"
                  height="14"
                  viewBox="0 0 300 271"
                  fill="currentColor"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M236 0h46L181 115l118 156h-92l-72-94-82 94H7l107-122L1 0h94l65 86L236 0zm-16 244h25L80 26H54l166 218z" />
                </svg>
              }
            >
              Start adventure
            </Button>
            <a
              href="https://mcg-2.gitbook.io/mcg/"
              target="_blank"
              rel="noopener noreferrer"
              className="mcg-btn ghost btn-lg home-hero-cta-secondary"
            >
              Read the docs <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <div className="home-hero-stage" aria-hidden="true">
          <div className="home-hero-stage-badge">Pack-ready roster</div>
          <div className="home-hero-cards-float">
            {HERO_CARDS.map((card) => (
              <article
                key={card.name}
                className={`home-float-card ${card.cls}`.trim()}
              >
                <div className="home-float-card-art">
                  <Image
                    src={card.img}
                    alt={card.label}
                    fill
                    sizes="(max-width: 900px) 40vw, 220px"
                    className="home-float-card-img"
                    unoptimized
                  />
                </div>
                <div className="home-float-card-body">
                  <span className="home-float-card-rarity">{card.rarity}</span>
                  <span className="home-float-card-name">{card.label}</span>
                  <span className="home-float-card-symbol">{card.symbol}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="home-hero-stage-note">
            <strong>Collectible obsession unlocked.</strong>
            <span>
              Every pack can feed collection, contests, and progression once you
              connect.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
