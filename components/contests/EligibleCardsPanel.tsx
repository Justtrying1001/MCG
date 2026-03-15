import type { LineupOption } from "@/components/contests/types";
import { LineupCardTile } from "@/components/contests/LineupCardTile";

export function EligibleCardsPanel({
  options,
  selectedIds,
  canManage,
  onToggle,
}: {
  options: LineupOption[];
  selectedIds: string[];
  canManage: boolean;
  onToggle: (instanceId: string) => void;
}) {
  return (
    <section className="contest-eligible-panel">
      <div className="contest-eligible-head">
        <p className="mcg-eyebrow">Bench / available cards</p>
        <strong>{options.length} cards</strong>
      </div>
      <div className="contest-eligible-grid visual">
        {options.slice(0, 10).map((item) => {
          const isSelected = selectedIds.includes(item.instanceId);
          const isLocked = item.isLockedInOtherContest && !isSelected;
          return (
            <LineupCardTile
              key={item.instanceId}
              option={item}
              selected={isSelected}
              disabled={!canManage || isLocked}
              onClick={() => onToggle(item.instanceId)}
            />
          );
        })}
      </div>
    </section>
  );
}
