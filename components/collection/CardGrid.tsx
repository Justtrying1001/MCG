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
      {items.map((item) => (
        <button
          key={item.templateId}
          type="button"
          className="collection-card-tile-trigger"
          onClick={() => onOpenCard(item.card, item.instanceCount)}
          title={`${item.card.displayName} · ×${item.instanceCount}`}
        >
          <MvpCardTile card={item.card} quantity={item.instanceCount} variant="collection" />
        </button>
      ))}
    </div>
  );
}
