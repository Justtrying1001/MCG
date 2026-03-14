import type { LineupOption } from "@/components/contests/types";

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
  return (
    <button
      type="button"
      className={`lineup-card-tile${selected ? " selected" : ""}${disabled ? " disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="lineup-card-art">
        {option.imageUrl ? <img src={option.imageUrl} alt={option.name} loading="lazy" /> : <span>No art</span>}
      </div>
      <div className="lineup-card-body">
        <strong>{option.name}</strong>
        <span>{option.rarityCode} · {option.editionCode}</span>
        <span>{option.tokenProjectName} · {option.cardSetCode}</span>
      </div>
    </button>
  );
}
