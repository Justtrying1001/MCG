import type { LineupOption } from "@/components/contests/types";
import { LineupCardTile } from "@/components/contests/LineupCardTile";

export function LineupSlot({
  index,
  card,
  canEdit,
  isActive,
  onRemove,
  onOpenPicker,
}: {
  index: number;
  card: LineupOption | null;
  canEdit: boolean;
  isActive: boolean;
  onRemove: () => void;
  onOpenPicker: () => void;
}) {
  return (
    <div className={`lineup-slot-v2${card ? " filled" : ""}${canEdit ? " editable" : ""}${isActive ? " active" : ""}`}>
      <div className="lineup-slot-v2-head">
        <span className="lineup-slot-v2-index">Slot {index + 1}</span>
        {canEdit ? (
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {card ? <button type="button" className="lineup-slot-v2-remove" onClick={onRemove}>Remove</button> : null}
            <button type="button" className="lineup-slot-v2-remove" onClick={onOpenPicker}>{card ? "Replace" : "Select"}</button>
          </div>
        ) : null}
      </div>

      {card ? (
        <LineupCardTile option={card} variant="collection" onClick={canEdit ? onOpenPicker : undefined} />
      ) : (
        <button type="button" className="lineup-slot-v2-empty" onClick={onOpenPicker} disabled={!canEdit}>
          <strong>Add card</strong>
          <span>{canEdit ? "Select a slot then assign from card pool" : "Team lock active"}</span>
        </button>
      )}
    </div>
  );
}
