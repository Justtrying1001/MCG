import type { LineupOption } from "@/components/contests/types";

type Props = {
  index: number;
  card: LineupOption | null;
  canEdit: boolean;
  onRemove: () => void;
  onOpenPicker: () => void;
};

export function LineupSlot({ index, card, canEdit, onRemove, onOpenPicker }: Props) {
  return (
    <div className={`lineup-slot${card ? " filled" : ""}${canEdit ? " editable" : ""}`}>
      <button type="button" className="lineup-slot-main" onClick={onOpenPicker} disabled={!canEdit} aria-label={`Select card for slot ${index + 1}`}>
        <span className="contest-slot-index">Slot {index + 1}</span>
        <span className="contest-slot-name">{card ? card.name : "Choose a card"}</span>
        <span className="contest-slot-subline">{card ? `${card.rarityCode} · ${card.editionCode} · ${card.cardSetCode}` : "Tap to open eligible cards"}</span>
      </button>
      {card && canEdit ? <button type="button" className="lineup-slot-remove" onClick={onRemove} aria-label="Remove card from slot">✕</button> : null}
    </div>
  );
}
