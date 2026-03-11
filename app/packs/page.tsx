"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { CardFrame } from "@/components/ui/CardFrame";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/components/useSession";
import type { BaseCard } from "@/types/cards";
import Image from "next/image";
import { useState } from "react";
import versoImage from "../../verso.png";

const ODDS = [
  { label: "Legendary", pct: "2%", color: "var(--rarity-legendary)" },
  { label: "Epic", pct: "8%", color: "var(--rarity-epic)" },
  { label: "Rare", pct: "20%", color: "var(--rarity-rare)" },
  { label: "Uncommon", pct: "30%", color: "var(--rarity-uncommon)" },
  { label: "Common", pct: "40%", color: "var(--rarity-common)" },
];

export default function PacksPage() {
  const { me, refresh, updateGuestState } = useSession();
  const [result, setResult] = useState<BaseCard[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [openingPhase, setOpeningPhase] = useState<"idle" | "tearing" | "revealing">("idle");

  const allRevealed = revealed.length > 0 && revealed.every(Boolean);
  const revealedCount = revealed.filter(Boolean).length;
  const nextRevealIndex = revealed.findIndex((isRevealed) => !isRevealed);

  const openPack = async () => {
    if (!me) return;

    setIsOpening(true);
    setOpeningPhase("tearing");
    setResult([]);
    setRevealed([]);

    const guestState = me.mode === "guest" ? {
      points: me.user.points,
      packsOpened: me.user.packsOpened,
      collection: me.collection,
      openingsCount: me.openingsCount,
    } : undefined;

    const res = await fetch(me.mode === "guest" ? "/api/guest/pack/open" : "/api/pack/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: guestState ? JSON.stringify({ state: guestState }) : undefined,
    });

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

    if (me.mode === "guest") {
      updateGuestState(payload.state);
    } else {
      await refresh();
    }
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
      <div className="page-header"><div><h1 className="page-title">Pack opening</h1><p className="page-subtitle">Open a Genesis Booster through a full collectible ritual: break the seal, lay out 5 face-down cards, and reveal each pull in sequence.</p></div></div>

      <div className={`pack-stage${openingPhase === "tearing" ? " is-opening" : ""}`}>
        <div className="pack-info"><div><p className="pack-info-title">Genesis Booster</p><p className="pack-info-desc">A sealed Series-1 MCG product containing 5 cards drawn from the complete base pool with weighted rarity distribution.</p></div><div className="pack-odds"><p className="pack-odds-label">Drop rates</p>{ODDS.map((o) => (<div key={o.label} className="pack-odds-row"><span className="pack-odds-rarity" style={{ color: o.color }}>{o.label}</span><span className="pack-odds-pct">{o.pct}</span></div>))}</div></div>

        <div className="pack-center">
          <div className={`pack-visual${openingPhase === "tearing" ? " is-tearing" : ""}`}>{/* visual unchanged */}<div className="pack-top-crimp" /><div className="pack-bottom-crimp" /><div className="pack-side-seam pack-side-seam-left" /><div className="pack-side-seam pack-side-seam-right" /><div className="pack-border-bevel" /><div className="pack-front-panel" /><div className="pack-top-lip" /><div className="pack-bottom-lip" /><div className="pack-material-grain" /><div className="pack-glint" /><div className="pack-open-flash" /><div className="pack-visual-inner"><div className="pack-zone pack-zone-header"><span className="pack-brand-lockup">MCG</span><span className="pack-visual-edition">GENESIS SET · SERIES 01</span><span className="pack-booster-line">SEALED TRADING CARD BOOSTER</span></div><div className="pack-zone pack-zone-title"><span className="pack-visual-name">GENESIS</span><span className="pack-visual-type">COLLECTOR BOOSTER PACK</span></div><div className="pack-content-band"><span>5 Cards</span><span>Base Pull</span><span>Factory Sealed</span></div><div className="pack-art-field"><div className="pack-art-core" /><div className="pack-art-ring" /><div className="pack-art-lines" /></div><div className="pack-footer-strip"><span>Official MCG product</span><span>1st Edition</span><span>Crypto collectible</span></div></div></div>
          <div className="pack-action-copy"><p className="pack-action-title">Genesis Booster — Standard pull</p><p className="pack-action-desc">Open one pack now and reveal all 5 cards manually, one at a time.</p></div>

          <Button onClick={() => void openPack()} disabled={!me || isOpening || openingPhase === "tearing"} className="btn-lg">{openingPhase === "tearing" ? "Breaking seal..." : isOpening ? "Preparing reveal..." : "Open pack"}</Button>
          {openingPhase === "tearing" && <p className="pack-opening-status">Foil tearing... cards incoming.</p>}
          {!me && <p className="pack-tip">Continue with X or start as guest to open packs.</p>}
          {me?.mode === "guest" && <p className="pack-tip">Guest mode is temporary. Progress is not persisted server-side.</p>}
        </div>
      </div>

      <Modal title={allRevealed ? "Pack complete - all cards revealed" : "Pack reveal - flip cards in order"} open={result.length > 0 && openingPhase === "revealing"} onClose={closeReveal}>
        <div className="reveal-progress-wrap"><p className="reveal-progress-text">Revealed {revealedCount}/{result.length}</p><div className="reveal-progress-track"><div className="reveal-progress-fill" style={{ width: `${(revealedCount / Math.max(result.length, 1)) * 100}%` }} /></div>{!allRevealed && <p className="reveal-next-copy">Next card to flip: #{nextRevealIndex + 1}</p>}</div>
        <div className="pack-reveal-grid">{result.map((card, index) => { const isCardRevealed = revealed[index]; const isNext = index === nextRevealIndex; return (<button key={`${card.baseCardId}_${index}`} className={`reveal-slot${isCardRevealed ? " is-revealed" : ""}${isNext ? " is-next" : ""}`} onClick={() => handleReveal(index)} disabled={isCardRevealed || !isNext}><div className="reveal-slot-inner"><div className="reveal-slot-face reveal-slot-back"><Image src={versoImage} alt="Card back" className="reveal-slot-back-image" /><span className="back-label">{isNext ? "Click to reveal" : "Awaiting previous card"}</span></div><div className="reveal-slot-face reveal-slot-front"><CardFrame card={card} /></div></div></button>); })}</div>
        {allRevealed && (<div className="reveal-complete-row"><p className="reveal-complete-copy">Full pack revealed. Cards have been added to your collection.</p><Button onClick={closeReveal}>Done</Button></div>)}
      </Modal>
    </SiteShell>
  );
}
