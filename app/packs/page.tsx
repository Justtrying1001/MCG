"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { CardFrame } from "@/components/ui/CardFrame";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/components/useSession";
import type { BaseCard } from "@/types/cards";
import { useState } from "react";

const ODDS = [
  { label: "Legendary", pct: "2%", color: "var(--gold)" },
  { label: "Epic", pct: "10%", color: "var(--magenta)" },
  { label: "Rare", pct: "28%", color: "var(--cyan)" },
  { label: "Common", pct: "60%", color: "var(--text-3)" },
];

export default function PacksPage() {
  const { me, refresh } = useSession();
  const [result, setResult] = useState<BaseCard[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [openingPhase, setOpeningPhase] = useState<"idle" | "tearing" | "revealing">("idle");

  const allRevealed = revealed.length > 0 && revealed.every(Boolean);
  const revealedCount = revealed.filter(Boolean).length;
  const nextRevealIndex = revealed.findIndex((isRevealed) => !isRevealed);

  const openPack = async () => {
    setIsOpening(true);
    setOpeningPhase("tearing");
    setResult([]);
    setRevealed([]);

    const res = await fetch("/api/pack/open", { method: "POST" });
    if (!res.ok) {
      alert(await res.text());
      setIsOpening(false);
      setOpeningPhase("idle");
      return;
    }

    const payload = await res.json();
    const pulled = payload.pulledCards as BaseCard[];

    setTimeout(() => {
      setResult(pulled);
      setRevealed(new Array(pulled.length).fill(false));
      setOpeningPhase("revealing");
      setIsOpening(false);
    }, 1000);

    await refresh();
  };

  const handleReveal = (index: number) => {
    if (revealed[index] || index !== nextRevealIndex) return;
    setRevealed((prev) => prev.map((item, itemIndex) => (itemIndex === index ? true : item)));
  };

  const closeReveal = () => {
    setResult([]);
    setRevealed([]);
    setOpeningPhase("idle");
  };

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pack opening</h1>
          <p className="page-subtitle">
            Open a Genesis Booster through a full collectible ritual: break the seal,
            lay out 5 face-down cards, and reveal each pull in sequence.
          </p>
        </div>
      </div>

      <div className={`pack-stage${openingPhase === "tearing" ? " is-opening" : ""}`}>
        <div className="pack-info">
          <div>
            <p className="pack-info-title">Genesis Booster</p>
            <p className="pack-info-desc">
              A sealed Series-1 MCG product containing 5 cards drawn from the complete
              base pool with weighted rarity distribution.
            </p>
          </div>

          <div className="pack-odds">
            <p className="pack-odds-label">Drop rates</p>
            {ODDS.map((o) => (
              <div key={o.label} className="pack-odds-row">
                <span className="pack-odds-rarity" style={{ color: o.color }}>{o.label}</span>
                <span className="pack-odds-pct">{o.pct}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pack-center">
          <div className={`pack-visual${openingPhase === "tearing" ? " is-tearing" : ""}`}>
            <div className="pack-top-crimp" aria-hidden="true" />
            <div className="pack-bottom-crimp" aria-hidden="true" />
            <div className="pack-side-seam pack-side-seam-left" aria-hidden="true" />
            <div className="pack-side-seam pack-side-seam-right" aria-hidden="true" />
            <div className="pack-border-bevel" aria-hidden="true" />
            <div className="pack-front-panel" aria-hidden="true" />
            <div className="pack-top-lip" aria-hidden="true" />
            <div className="pack-bottom-lip" aria-hidden="true" />
            <div className="pack-tear-notch" aria-hidden="true">TEAR</div>
            <div className="pack-auth-strip" aria-hidden="true">AUTHENTIC MCG SEALED PRODUCT</div>
            <div className="pack-stamp" aria-hidden="true">1ST EDITION</div>
            <div className="pack-foil-strip" aria-hidden="true" />
            <div className="pack-energy" aria-hidden="true" />
            <div className="pack-material-grain" aria-hidden="true" />
            <div className="pack-glint" aria-hidden="true" />
            <div className="pack-open-flash" aria-hidden="true" />

            <div className="pack-visual-inner">
              <span className="pack-brand-lockup">MCG</span>
              <span className="pack-visual-edition">GENESIS SET // SERIES 01 // SEALED BOOSTER</span>
              <span className="pack-visual-name">GENESIS</span>
              <span className="pack-visual-type">TRADING CARD BOOSTER</span>

              <div className="pack-visual-divider" />
              <span className="pack-visual-subline">DIGITAL ASSET FACTION EDITION</span>
              <div className="pack-content-band">
                <span>5 Cards</span>
                <span>Base Pull</span>
                <span>Factory Sealed</span>
              </div>
              <span className="pack-visual-series">OFFICIAL MCG PACK PRODUCT</span>
            </div>

            <div className="pack-seal" aria-hidden="true">Factory sealed</div>
            <div className="pack-corner-mark" aria-hidden="true">◈ MCG ◈</div>
          </div>

          <div className="pack-action-copy">
            <p className="pack-action-title">Genesis Booster — Standard pull</p>
            <p className="pack-action-desc">Open one pack now and reveal all 5 cards manually, one at a time.</p>
          </div>

          <Button
            onClick={() => void openPack()}
            disabled={!me || isOpening || openingPhase === "tearing"}
            className="btn-lg"
          >
            {openingPhase === "tearing" ? "Breaking seal..." : isOpening ? "Preparing reveal..." : "Open pack"}
          </Button>

          {openingPhase === "tearing" && (
            <p className="pack-opening-status">Foil tearing... cards incoming.</p>
          )}

          {!me && <p className="pack-tip">Sign in to open packs and build your collection.</p>}
        </div>

        <div className="pack-right">
          <div className="pack-side-card">
            <p className="pack-side-card-label">Opening protocol</p>
            <p className="pack-side-card-copy">
              Tear pack → cards fan face-down → reveal each card in sequence → finalize results.
            </p>
          </div>

          <div className="pack-side-card">
            <p className="pack-side-card-label">Reveal quality</p>
            <p className="pack-side-card-copy">
              Card backs are interactive. Each flip is deliberate and updates your permanent collection.
            </p>
          </div>
        </div>
      </div>

      <Modal
        title={allRevealed ? "Pack complete - all cards revealed" : "Pack reveal - flip cards in order"}
        open={result.length > 0 && openingPhase === "revealing"}
        onClose={closeReveal}
      >
        <div className="reveal-progress-wrap">
          <p className="reveal-progress-text">Revealed {revealedCount}/{result.length}</p>
          <div className="reveal-progress-track">
            <div className="reveal-progress-fill" style={{ width: `${(revealedCount / Math.max(result.length, 1)) * 100}%` }} />
          </div>
          {!allRevealed && (
            <p className="reveal-next-copy">Next card to flip: #{nextRevealIndex + 1}</p>
          )}
        </div>

        <div className="pack-reveal-grid">
          {result.map((card, index) => {
            const isCardRevealed = revealed[index];
            const isNext = index === nextRevealIndex;

            return (
              <button
                key={`${card.baseCardId}_${index}`}
                className={`reveal-slot${isCardRevealed ? " is-revealed" : ""}${isNext ? " is-next" : ""}`}
                onClick={() => handleReveal(index)}
                disabled={isCardRevealed || !isNext}
                aria-label={isCardRevealed ? `${card.name} revealed` : `Reveal card ${index + 1}`}
              >
                <div className="reveal-slot-inner">
                  <div className="reveal-slot-face reveal-slot-back">
                    <span className="back-mark">◈</span>
                    <span className="back-brand">MCG GENESIS</span>
                    <span className="back-label">{isNext ? "Click to reveal" : "Awaiting previous card"}</span>
                  </div>

                  <div className="reveal-slot-face reveal-slot-front">
                    <CardFrame card={card} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {allRevealed && (
          <div className="reveal-complete-row">
            <p className="reveal-complete-copy">Full pack revealed. Cards have been added to your collection.</p>
            <Button onClick={closeReveal}>Done</Button>
          </div>
        )}
      </Modal>
    </SiteShell>
  );
}
