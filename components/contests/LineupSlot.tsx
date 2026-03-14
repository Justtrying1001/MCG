import type { LineupOption } from "@/components/contests/types";

export function LineupSlot({
  index,
  card,
  canEdit,
  onRemove,
  onOpenPicker,
}: {
  index: number;
  card: LineupOption | null;
  canEdit: boolean;
  onRemove: () => void;
  onOpenPicker: () => void;
}) {
  return (
    <div className={`lineup-slot-v2${card ? " filled" : ""}${canEdit ? " editable" : ""}`}>
      <button type="button" className="lineup-slot-v2-main" onClick={onOpenPicker} disabled={!canEdit}>
        <span className="lineup-slot-v2-index">Slot {index + 1}</span>
        {card?.imageUrl ? <img className="lineup-slot-v2-art" src={card.imageUrl} alt={card.name} loading="lazy" /> : null}
        <strong className="lineup-slot-v2-name">{card ? card.name : "Select a card"}</strong>
        <span className="lineup-slot-v2-sub">{card ? `${card.rarityCode} · ${card.editionCode} · ${card.cardSetCode}` : "Eligible cards only"}</span>
      </button>
      {card && canEdit ? <button type="button" className="lineup-slot-v2-remove" onClick={onRemove}>Replace</button> : null}
    </div>
  );
}
