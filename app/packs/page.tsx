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
    }, 900);

    await refresh();
  };

  const handleReveal = (index: number) => {
    if (revealed[index]) return;
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
            Crack open a premium Genesis Booster and run a full reveal ritual. Tear the pack,
            fan the card backs, then flip each pull one by one.
          </p>
        </div>
      </div>

      <div className={`pack-stage${openingPhase === "tearing" ? " is-opening" : ""}`}>
        <div className="pack-info">
          <div>
            <p className="pack-info-title">Genesis Booster</p>
            <p className="pack-info-desc">
              The foundational MCG booster. Contains 5 cards drawn from the full
              card pool with standard rarity distribution.
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
            <div className="pack-visual-inner">
              <span className="pack-visual-edition">MCG // GEN-01</span>
              <span className="pack-visual-name">GENESIS</span>
              <span className="pack-visual-type">CRYPTO BOOSTER</span>
              <span className="pack-visual-cta">5 collectible cards</span>
            </div>

            <div className="pack-foil-strip" aria-hidden="true" />
            <div className="pack-seal" aria-hidden="true">SEALED</div>
            <div className="pack-corner-mark" aria-hidden="true">◈ MCG ◈</div>
            <div className="pack-energy" aria-hidden="true" />
            <div className="pack-glint" aria-hidden="true" />
            <div className="pack-open-flash" aria-hidden="true" />
          </div>

          <div className="pack-action-copy">
            <p className="pack-action-title">Genesis Booster</p>
            <p className="pack-action-desc">Open to receive 5 base cards with standard weighted rarity distribution.</p>
          </div>

          <Button
            onClick={() => void openPack()}
            disabled={!me || isOpening || openingPhase === "tearing"}
            className="btn-lg"
          >
            {openingPhase === "tearing" ? "Tearing pack..." : isOpening ? "Preparing reveal..." : "Open pack"}
          </Button>

          {openingPhase === "tearing" && (
            <p className="pack-opening-status">Quantum seal rupturing... stand by for card reveal.</p>
          )}

          {!me && <p className="pack-tip">Sign in to open packs and build your collection.</p>}
        </div>

        <div className="pack-right">
          <div style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.02)",
            padding: "1.1rem",
          }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "0.75rem" }}>
              Opening protocol
            </p>
            <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.65 }}>
              1) Tear booster. 2) Cards fan in face-down. 3) Flip each card manually.
              4) Confirm full reveal.
            </p>
          </div>

          <div style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.02)",
            padding: "1.1rem",
          }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "0.75rem" }}>
              Reveal tip
            </p>
            <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.65 }}>
              Hover each card back and click to flip. Every reveal is tracked in your permanent collection.
            </p>
          </div>
        </div>
      </div>

      <Modal
        title={allRevealed ? "Pack complete - all cards revealed" : "Pack reveal - click each card to flip"}
        open={result.length > 0 && openingPhase === "revealing"}
        onClose={closeReveal}
      >
        <div className="reveal-progress-wrap">
          <p className="reveal-progress-text">
            Revealed {revealedCount}/{result.length}
          </p>
          <div className="reveal-progress-track">
            <div
              className="reveal-progress-fill"
              style={{ width: `${(revealedCount / Math.max(result.length, 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="pack-reveal-grid">
          {result.map((card, index) => {
            const isCardRevealed = revealed[index];

            return (
              <button
                key={`${card.baseCardId}_${index}`}
                className={`reveal-slot${isCardRevealed ? " is-revealed" : ""}`}
                onClick={() => handleReveal(index)}
                disabled={isCardRevealed}
                aria-label={isCardRevealed ? `${card.name} revealed` : `Reveal card ${index + 1}`}
              >
                <div className="reveal-slot-inner">
                  <div className="reveal-slot-face reveal-slot-back">
                    <span className="back-mark">◈</span>
                    <span className="back-brand">MCG GENESIS</span>
                    <span className="back-label">Tap to reveal</span>
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
