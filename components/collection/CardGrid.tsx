import { MemedexCardTriggerSurface } from "@/components/ui/MemedexCardSurface";
import { formatMemedexFinish } from "@/components/collection/memedexFinish";
import type { MvpCardView } from "@/types/cards";

type CardGridItem = {
  templateId: string;
  instanceCount: number;
  card: MvpCardView;
};

type CardGridProps = {
  items: CardGridItem[];
  onOpenCard: (card: MvpCardView, quantity: number) => void;
  missingCount?: number;
  guestMode?: boolean;
};

const LOCKED_PREVIEW_CAP = 12;

export function CardGrid({ items, onOpenCard, missingCount = 0, guestMode = false }: CardGridProps) {
  const lockedPreviewCount = guestMode ? 0 : Math.min(Math.max(missingCount, 0), LOCKED_PREVIEW_CAP);

  return (
    <div className="collection-card-grid memedex-grid">
      {items.map((item, index) => {
        const hasMultipleCopies = item.instanceCount > 1;
        const finishLabel = formatMemedexFinish(item.card.edition).toUpperCase();
        const slotLabel = item.card.cardNumber ?? `#${String(index + 1).padStart(3, "0")}`;

        return (
          <div key={item.templateId} className="collection-card-tile memedex-card-tile">
            <button
              type="button"
              className="collection-card-tile-trigger"
              onClick={() => onOpenCard(item.card, item.instanceCount)}
              title={`${item.card.displayName} · ×${item.instanceCount}`}
            >
              <MemedexCardTriggerSurface card={item.card} quantity={item.instanceCount} />
            </button>

            <div className="collection-card-meta memedex-card-meta" aria-label={`Inventory details for ${item.card.displayName}`}>
              <strong className="collection-card-meta-title">{item.card.displayName}</strong>
              <div className="memedex-card-detail-line memedex-card-detail-line--muted">
                <span>{item.card.rarity}</span>
                <span aria-hidden="true">•</span>
                <span>{finishLabel}</span>
              </div>
              <div className="memedex-card-detail-line memedex-card-detail-line--footer">
                <span className={`collection-card-copies${hasMultipleCopies ? " is-multiple" : ""}`}>
                  {hasMultipleCopies ? `${item.instanceCount} copies` : "1 copy"}
                </span>
                <span className="memedex-card-index">{slotLabel}</span>
              </div>
            </div>
          </div>
        );
      })}

      {Array.from({ length: lockedPreviewCount }, (_, index) => (
        <div key={`locked-${index}`} className="collection-card-tile memedex-card-tile memedex-card-tile--locked" aria-label="Locked Memedex entry">
          <div className="memedex-card-trigger memedex-card-trigger--locked" aria-hidden="true">
            <span className="memedex-card-rarity-bar rarity-locked" />
            <div className="memedex-card-frame memedex-card-frame--locked">
              <div className="memedex-card-frame-shell">
                <div className="memedex-card-placeholder">
                  <div className="memedex-card-placeholder__mark">?</div>
                  <div className="memedex-card-placeholder__copy">
                    <span>Undiscovered</span>
                    <strong>Hidden slot</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="collection-card-meta memedex-card-meta memedex-card-meta--locked">
            <strong className="collection-card-meta-title">Undiscovered meme</strong>
            <div className="memedex-card-detail-line memedex-card-detail-line--muted">
              <span>Locked</span>
              <span aria-hidden="true">•</span>
              <span>Hidden finish</span>
            </div>
            <div className="memedex-card-detail-line memedex-card-detail-line--footer">
              <span className="collection-card-copies">Reveal to discover</span>
              <span className="memedex-card-index">????</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
