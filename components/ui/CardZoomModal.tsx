"use client";

import { useEffect } from "react";
import type { MvpCardView } from "@/types/cards";
import { MvpCardTile } from "@/components/ui/MvpCardTile";

type CardZoomModalProps = {
  card: MvpCardView | null;
  quantity?: number;
  open: boolean;
  onClose: () => void;
};

export function CardZoomModal({ card, quantity, open, onClose }: CardZoomModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !card) return null;

  return (
    <div className="card-zoom-overlay" onClick={onClose} role="presentation">
      <div
        className="card-zoom-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Zoomed card view for ${card.displayName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-zoom-shell">
          <div className="card-zoom-chrome">
            <div className="card-zoom-meta">
              <span className="card-zoom-kicker">Card viewer</span>
              <strong>{card.displayName}</strong>
              {typeof quantity === "number" && quantity > 1 ? <span>{`Inventory: x${quantity} copies`}</span> : null}
            </div>
            <button className="icon-btn card-zoom-close" onClick={onClose} aria-label="Close zoom">
              ✕
            </button>
          </div>

          <div className="card-zoom-container">
            <MvpCardTile card={card} quantity={quantity} variant="zoom" />
          </div>
        </div>
      </div>
    </div>
  );
}
