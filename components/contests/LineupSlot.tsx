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
    <div className={`lineup-slot${card ? " filled" : ""}`}>
      <button type="button" className="lineup-slot-main" onClick={onOpenPicker} disabled={!canEdit} aria-label={`Select card for slot ${index + 1}`}>
        <span className="contest-slot-index">Slot {index + 1}</span>
        <span className="contest-slot-name">{card ? `${card.name} · ${card.rarityCode}/${card.editionCode}` : "Choisir une carte"}</span>
      </button>
      {card && canEdit ? <button type="button" className="lineup-slot-remove" onClick={onRemove} aria-label="Remove card from slot">✕</button> : null}
    </div>
  );
}
