import { MvpCardTile } from "@/components/ui/MvpCardTile";
import type { LineupOption } from "@/components/contests/types";
import { toMvpCardView } from "@/components/contests/lineupCardMapper";

export function LineupCardTile({
  option,
  selected,
  disabled,
  onClick,
  variant = "compact",
}: {
  option: LineupOption;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "collection" | "compact";
}) {
  return (
    <button
      type="button"
      className={`lineup-card-tile${selected ? " selected" : ""}${disabled ? " disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <MvpCardTile card={toMvpCardView(option)} variant={variant} interactive={false} />
      <div className="lineup-card-tile-footer">
        <strong>{option.name}</strong>
        <span>{option.rarityCode} · {option.editionCode} · {option.cardSetCode}</span>
      </div>
    </button>
  );
}
