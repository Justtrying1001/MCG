import { MvpCardTile } from "@/components/ui/MvpCardTile";
import type { MvpCardView } from "@/types/cards";

type MemedexCardSurfaceProps = {
  card: MvpCardView;
  quantity?: number;
  imageLoading?: "lazy" | "eager";
};

type MemedexCardTriggerSurfaceProps = MemedexCardSurfaceProps & {
  className?: string;
};

export function MemedexCardSurface({
  card,
  quantity = 1,
  imageLoading = "lazy",
}: MemedexCardSurfaceProps) {
  return (
    <>
      <span
        className={`memedex-card-rarity-bar rarity-${card.rarity.toLowerCase()}`}
        aria-hidden="true"
      />
      <div className="memedex-card-frame">
        <div className="memedex-card-frame-shell">
          <MvpCardTile
            card={card}
            quantity={quantity}
            variant="canonical"
            imageLoading={imageLoading}
          />
        </div>
      </div>
    </>
  );
}

export function MemedexCardTriggerSurface({
  card,
  quantity = 1,
  imageLoading = "lazy",
  className = "collection-card-tile-trigger memedex-card-trigger",
}: MemedexCardTriggerSurfaceProps) {
  return (
    <div className={className}>
      <MemedexCardSurface
        card={card}
        quantity={quantity}
        imageLoading={imageLoading}
      />
    </div>
  );
}
