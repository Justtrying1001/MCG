"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/components/useSession";
import type { MvpCardView } from "@/types/cards";
import Image from "next/image";
import { useMemo, useState } from "react";
import officialPackImage from "../../pack.png";
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
  const [resultMvp, setResultMvp] = useState<MvpCardView[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [openingPhase, setOpeningPhase] = useState<"idle" | "tearing" | "revealing">("idle");

  const revealSize = resultMvp.length;
  const allRevealed = revealed.length > 0 && revealed.every(Boolean);
  const revealedCount = revealed.filter(Boolean).length;
  const nextRevealIndex = revealed.findIndex((isRevealed) => !isRevealed);

  const openPack = async () => {
    if (!me) return;

    setIsOpening(true);
    setOpeningPhase("tearing");
    setResultMvp([]);
    setRevealed([]);

    const guestState = me.mode === "guest" ? {
      points: me.user.points,
      packsOpened: me.user.packsOpened,
      mvpCollection: me.mvpCollection,
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
    const pulledMvp = (payload.pulledCardsMvp ?? []) as MvpCardView[];

    if (pulledMvp.length === 0) {
      alert("Pack opened but MVP reveal payload is missing. Please refresh and retry.");
      setIsOpening(false);
      setOpeningPhase("idle");
      if (me.mode === "guest") {
        updateGuestState(payload.state);
      } else {
        await refresh();
      }
      return;
    }

    setTimeout(() => {
      setResultMvp(pulledMvp);
      setRevealed(new Array(pulledMvp.length).fill(false));
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
    setResultMvp([]);
    setRevealed([]);
    setOpeningPhase("idle");
  };

  const revealCards = useMemo(
    () => resultMvp.map((card, index) => ({
      key: `${card.templateId}_${index}`,
      render: <MvpCardTile card={card} quantity={1} />,
    })),
    [resultMvp]
  );

  return (
    <SiteShell>
      <div className="page-header"><div><h1 className="page-title">Pack opening</h1><p className="page-subtitle">Open a Genesis Booster through a full collectible ritual: break the seal, lay out 5 face-down cards, and reveal each premium card face in sequence.</p></div></div>

      <div className={`pack-stage${openingPhase === "tearing" ? " is-opening" : ""}`}>
        <div className="pack-info"><div><p className="pack-info-title">Genesis Booster</p><p className="pack-info-desc">A sealed Series-1 MCG product containing 5 cards drawn from the complete base pool with weighted rarity distribution.</p></div><div className="pack-odds"><p className="pack-odds-label">Drop rates</p>{ODDS.map((o) => (<div key={o.label} className="pack-odds-row"><span className="pack-odds-rarity" style={{ color: o.color }}>{o.label}</span><span className="pack-odds-pct">{o.pct}</span></div>))}</div></div>

        <div className="pack-center">
          <div className={`pack-visual${openingPhase === "tearing" ? " is-tearing" : ""}`}>
            <Image src={officialPackImage} alt="Official MCG booster pack" className="pack-visual-image" priority />
            <div className="pack-open-flash" />
          </div>
          <div className="pack-action-copy"><p className="pack-action-title">Genesis Booster — Standard pull</p><p className="pack-action-desc">Open one pack now and reveal all 5 cards manually, one at a time.</p></div>

          <Button onClick={() => void openPack()} disabled={!me || isOpening || openingPhase === "tearing"} className="btn-lg">{openingPhase === "tearing" ? "Breaking seal..." : isOpening ? "Preparing reveal..." : "Open pack"}</Button>
          {openingPhase === "tearing" && <p className="pack-opening-status">Foil tearing... cards incoming.</p>}
          {!me && <p className="pack-tip">Continue with X or start as guest to open packs.</p>}
          {me?.mode === "guest" && <p className="pack-tip">Guest mode is temporary and local. Connect X for persistent ownership.</p>}
          {me?.mode === "user" && <p className="pack-tip">Authenticated mode saves every revealed card directly to your collection.</p>}
        </div>
      </div>

      <Modal title={allRevealed ? "Pack complete - all cards revealed" : "Pack reveal - flip cards in order"} open={revealSize > 0 && openingPhase === "revealing"} onClose={closeReveal}>
        <div className="reveal-progress-wrap"><p className="reveal-progress-text">Revealed {revealedCount}/{revealSize}</p><div className="reveal-progress-track"><div className="reveal-progress-fill" style={{ width: `${(revealedCount / Math.max(revealSize, 1)) * 100}%` }} /></div>{!allRevealed && <p className="reveal-next-copy">Next card to flip: #{nextRevealIndex + 1}</p>}</div>
        <div className="pack-reveal-grid">{revealCards.map((card, index) => { const isCardRevealed = revealed[index]; const isNext = index === nextRevealIndex; return (<button key={card.key} className={`reveal-slot${isCardRevealed ? " is-revealed" : ""}${isNext ? " is-next" : ""}`} onClick={() => handleReveal(index)} disabled={isCardRevealed || !isNext}><div className="reveal-slot-inner"><div className="reveal-slot-face reveal-slot-back"><Image src={versoImage} alt="Card back" className="reveal-slot-back-image" /><span className="back-label">{isNext ? "Click to reveal" : "Awaiting previous card"}</span></div><div className="reveal-slot-face reveal-slot-front">{card.render}</div></div></button>); })}</div>
        {allRevealed && (<div className="reveal-complete-row"><p className="reveal-complete-copy">Full pack revealed. Cards have been added to your collection.</p><Button onClick={closeReveal}>Done</Button></div>)}
      </Modal>
    </SiteShell>
  );
}
