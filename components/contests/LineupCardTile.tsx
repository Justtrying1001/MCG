import { MvpCardTile } from "@/components/ui/MvpCardTile";
import type { LineupOption } from "@/components/contests/types";
import { toMvpCardView } from "@/components/contests/lineupCardMapper";

export function LineupCardTile({
  option,
  selected,
  disabled,
  onClick,
}: {
  option: LineupOption;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const cardView = toMvpCardView(option);

  return (
    <button
      type="button"
      className={`lineup-card-tile${selected ? " selected" : ""}${disabled ? " disabled" : ""}`}
      onClick={onClick}
      disabled={disabled || !cardView}
      aria-pressed={selected}
    >
      <div className="lineup-card-visual">
        {cardView ? (
          <MvpCardTile card={cardView} variant="canonical" interactive={false} />
        ) : (
          <div className="lineup-card-missing" role="status" aria-live="polite">
            Card preview unavailable
          </div>
        )}
      </div>
      <div className="lineup-card-tile-footer">
        <strong>{option.name}</strong>
        <span>{option.rarityCode} · {option.editionCode} · {option.cardSetCode}</span>
      </div>
    </button>
  );
}
