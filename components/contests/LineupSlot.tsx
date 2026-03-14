import type { LineupOption } from "@/components/contests/types";
import { LineupCardTile } from "@/components/contests/LineupCardTile";

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
      <div className="lineup-slot-v2-head">
        <span className="lineup-slot-v2-index">Slot {index + 1}</span>
        {card && canEdit ? <button type="button" className="lineup-slot-v2-remove" onClick={onRemove}>Replace</button> : null}
      </div>

      {card ? (
        <LineupCardTile option={card} variant="collection" onClick={canEdit ? onOpenPicker : undefined} />
      ) : (
        <button type="button" className="lineup-slot-v2-empty" onClick={onOpenPicker} disabled={!canEdit}>
          <strong>Add card</strong>
          <span>{canEdit ? "Click to choose from your collection" : "Team lock active"}</span>
        </button>
      )}
    </div>
  );
}
