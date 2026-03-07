"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { CardFrame } from "@/components/ui/CardFrame";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/components/useSession";
import type { BaseCard } from "@/types/cards";
import { useState } from "react";

const ODDS = [
  { label: "Legendary", pct: "2%",  color: "var(--gold)" },
  { label: "Epic",      pct: "10%", color: "var(--magenta)" },
  { label: "Rare",      pct: "28%", color: "var(--cyan)" },
  { label: "Common",    pct: "60%", color: "var(--text-3)" },
];

export default function PacksPage() {
  const { me, refresh } = useSession();
  const [result, setResult] = useState<BaseCard[]>([]);
  const [isOpening, setIsOpening] = useState(false);

  const openPack = async () => {
    setIsOpening(true);
    const res = await fetch("/api/pack/open", { method: "POST" });
    if (!res.ok) {
      alert(await res.text());
      setIsOpening(false);
      return;
    }
    const payload = await res.json();
    setResult(payload.pulledCards as BaseCard[]);
    await refresh();
    setTimeout(() => setIsOpening(false), 760);
  };

  return (
    <SiteShell>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pack opening</h1>
          <p className="page-subtitle">
            Crack open a Genesis Booster and discover your next legendary pull. Every pack
            contains 5 cards with weighted rarity drops.
          </p>
        </div>
      </div>

      {/* Pack stage */}
      <div className={`pack-stage${isOpening ? " is-opening" : ""}`}>
        {/* Left — info */}
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

        {/* Center — pack visual + CTA */}
        <div className="pack-center">
          <div className="pack-visual">
            <div className="pack-visual-inner">
              <span className="pack-visual-name">GENESIS</span>
              <span className="pack-visual-type">BOOSTER PACK</span>
            </div>
          </div>

          <Button
            onClick={() => void openPack()}
            disabled={!me || isOpening}
            className="btn-lg"
          >
            {isOpening ? "Revealing…" : "Open pack"}
          </Button>

          {!me && (
            <p className="pack-tip">Sign in to open packs and build your collection.</p>
          )}
        </div>

        {/* Right — tips */}
        <div className="pack-right">
          <div style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.02)",
            padding: "1.1rem",
          }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "0.75rem" }}>
              Pack strategy
            </p>
            <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.65 }}>
              Build a 3-card squad with high synergy before heading into PvE.
              Prioritise cards with complementary ATK and DEF values.
            </p>
          </div>

          <div style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.02)",
            padding: "1.1rem",
          }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "0.75rem" }}>
              Reveal ritual
            </p>
            <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.65 }}>
              Card-by-card reveal reinforces ownership and collection desire.
              Each pull adds to your permanent roster.
            </p>
          </div>
        </div>
      </div>

      {/* Pull reveal modal */}
      <Modal title="Pack reveal — 5 cards pulled" open={result.length > 0 && !isOpening} onClose={() => setResult([])}>
        <div className="card-grid">
          {result.map((card) => (
            <CardFrame key={card.baseCardId} card={card} />
          ))}
        </div>
      </Modal>
    </SiteShell>
  );
}
