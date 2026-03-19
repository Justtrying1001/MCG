"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { MvpCardTile } from "@/components/ui/MvpCardTile";
import type { MvpCardView } from "@/types/cards";
import { classifyReveal } from "@/components/packs/reveal-classifier";

type RevealPhase = "hidden" | "intro" | "revealed";

type PackRevealSlotProps = {
  card: MvpCardView;
  cardBackSrc: Parameters<typeof Image>[0]["src"];
  index: number;
  isRevealed: boolean;
  isNext: boolean;
  onReveal: (index: number) => void;
  onZoom: (card: MvpCardView) => void;
};

const INTRO_DURATION_MS = 640;

export function PackRevealSlot({
  card,
  cardBackSrc,
  index,
  isRevealed,
  isNext,
  onReveal,
  onZoom,
}: PackRevealSlotProps) {
  const [revealPhase, setRevealPhase] = useState<RevealPhase>(isRevealed ? "revealed" : "hidden");
  const classification = classifyReveal(card);

  useEffect(() => {
    if (!isRevealed) {
      setRevealPhase("hidden");
      return;
    }

    setRevealPhase((current) => (current === "hidden" ? "intro" : current));
    const timeout = window.setTimeout(() => {
      setRevealPhase("revealed");
    }, INTRO_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [isRevealed]);

  return (
    <button
      className={`reveal-slot${isRevealed ? " is-revealed" : ""}${isNext ? " is-next" : ""}`}
      onClick={() => {
        if (isRevealed) {
          onZoom(card);
          return;
        }
        onReveal(index);
      }}
      disabled={!isRevealed && !isNext}
      data-reveal-intensity={classification.revealIntensity}
      data-reveal-preset={classification.revealPreset}
      data-edition-effect={classification.editionEffect}
      data-spotlight-level={classification.spotlightLevel}
      data-reveal-phase={revealPhase}
      type="button"
    >
      <div className="reveal-slot-spotlight" aria-hidden="true" />
      <div className="reveal-slot-ring" aria-hidden="true" />
      <div className="reveal-slot-edition-flare" aria-hidden="true" />

      <div className="reveal-slot-inner">
        <div className="reveal-slot-face reveal-slot-back">
          <Image src={cardBackSrc} alt="Card back" className="reveal-slot-back-image" />
          <span className="back-label">{isNext ? "Click to reveal" : "Awaiting previous"}</span>
        </div>
        <div className="reveal-slot-face reveal-slot-front">
          <MvpCardTile card={card} quantity={1} variant="canonical" imageLoading="eager" />
        </div>
      </div>
    </button>
  );
}
