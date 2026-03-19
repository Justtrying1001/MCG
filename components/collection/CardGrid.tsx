import { MvpCardTile } from "@/components/ui/MvpCardTile";
import type { MvpCardView } from "@/types/cards";

type CardGridItem = {
  templateId: string;
  instanceCount: number;
  card: MvpCardView;
};

type CardGridProps = {
  items: CardGridItem[];
  onOpenCard: (card: MvpCardView, quantity: number) => void;
};

export function CardGrid({ items, onOpenCard }: CardGridProps) {
  return (
    <div className="collection-card-grid">
      {items.map((item) => {
        const hasMultipleCopies = item.instanceCount > 1;

        return (
          <div key={item.templateId} className="collection-card-tile">
            <button
              type="button"
              className="collection-card-tile-trigger"
              onClick={() => onOpenCard(item.card, item.instanceCount)}
              title={`${item.card.displayName} · ×${item.instanceCount}`}
            >
              <MvpCardTile card={item.card} quantity={item.instanceCount} variant="canonical" />
            </button>

            <div className="collection-card-meta" aria-label={`Inventory details for ${item.card.displayName}`}>
              <div className="collection-card-meta-row">
                <strong className="collection-card-meta-title">{item.card.displayName}</strong>
                <span className="collection-card-meta-edition">{item.card.edition}</span>
              </div>
              <div className="collection-card-meta-row">
                <span className="collection-card-meta-rarity">{item.card.rarity}</span>
                <span className={`collection-card-copies${hasMultipleCopies ? " is-multiple" : ""}`}>
                  {hasMultipleCopies ? `x${item.instanceCount} copies` : "1 copy"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
