"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { MemedexCardSurface } from "@/components/ui/MemedexCardSurface";
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

const INTRO_DURATION_MS = 900;

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
    <div
      className={`reveal-slot${isRevealed ? " is-revealed" : ""}${isNext ? " is-next" : ""}`}
      data-reveal-intensity={classification.revealIntensity}
      data-reveal-preset={classification.revealPreset}
      data-edition-effect={classification.editionEffect}
      data-spotlight-level={classification.spotlightLevel}
      data-reveal-phase={revealPhase}
    >
      {isRevealed ? (
        <div className="reveal-slot-card collection-card-tile memedex-card-tile">
          <button
            className="collection-card-tile-trigger memedex-card-trigger"
            onClick={() => onZoom(card)}
            type="button"
          >
            <MemedexCardSurface card={card} quantity={1} imageLoading="eager" />
          </button>
        </div>
      ) : (
        <button
          className="reveal-slot-back-button"
          onClick={() => onReveal(index)}
          disabled={!isNext}
          type="button"
        >
          <div className="reveal-slot-inner">
            <div className="reveal-slot-face reveal-slot-back">
              <Image
                src={cardBackSrc}
                alt="Card back"
                fill
                sizes="(max-width: 1280px) 18vw, 210px"
                className="reveal-slot-back-image"
              />
              <span className="back-label">{isNext ? "Click to reveal" : "Awaiting previous"}</span>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
