import { MemedexCardSurface } from "@/components/ui/MemedexCardSurface";
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

        return (
          <div key={item.templateId} className="collection-card-tile memedex-card-tile">
            <div className="memedex-slot-tab" aria-hidden="true">Owned slot</div>
            <button
              type="button"
              className="collection-card-tile-trigger memedex-card-trigger"
              onClick={() => onOpenCard(item.card, item.instanceCount)}
              title={`${item.card.displayName} · ×${item.instanceCount}`}
            >
              <MemedexCardSurface card={item.card} quantity={item.instanceCount} />
            </button>

            <div className="collection-card-meta memedex-card-meta" aria-label={`Inventory details for ${item.card.displayName}`}>
              <div className="collection-card-meta-row">
                <strong className="collection-card-meta-title">{item.card.displayName}</strong>
                <span className="collection-card-meta-edition">{item.card.setEditionLabel ?? item.card.edition}</span>
              </div>
              <div className="collection-card-meta-row">
                <span className="collection-card-meta-rarity">{item.card.rarity}</span>
                <span className={`collection-card-copies${hasMultipleCopies ? " is-multiple" : ""}`}>
                  {hasMultipleCopies ? `x${item.instanceCount} copies` : "1 copy"}
                </span>
              </div>
              <div className="memedex-card-footer">
                <span className="memedex-card-status">Discovered</span>
                <span className="memedex-card-index">#{String(index + 1).padStart(3, "0")}</span>
              </div>
            </div>
          </div>
        );
      })}

      {Array.from({ length: lockedPreviewCount }, (_, index) => (
        <div key={`locked-${index}`} className="collection-card-tile memedex-card-tile memedex-card-tile--locked" aria-label="Locked Memedex entry">
          <div className="memedex-slot-tab memedex-slot-tab--locked" aria-hidden="true">Locked slot</div>
          <div className="memedex-card-trigger memedex-card-trigger--locked" aria-hidden="true">
            <span className="memedex-card-rarity-bar rarity-locked" />
            <div className="memedex-card-frame memedex-card-frame--locked">
              <div className="memedex-card-lock-mark">?</div>
              <span>Locked entry</span>
            </div>
          </div>
          <div className="collection-card-meta memedex-card-meta">
            <div className="collection-card-meta-row">
              <strong className="collection-card-meta-title">Undiscovered meme</strong>
              <span className="collection-card-meta-edition">Hidden</span>
            </div>
            <div className="collection-card-meta-row">
              <span className="collection-card-meta-rarity">Locked</span>
              <span className="collection-card-copies">0 copies</span>
            </div>
            <div className="memedex-card-footer">
              <span className="memedex-card-status memedex-card-status--locked">Open packs to reveal</span>
              <span className="memedex-card-index">???</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
