import type { LineupOption } from "@/components/contests/types";

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
        <p className="mcg-eyebrow">Eligible cards</p>
        <strong>{options.length} available</strong>
      </div>
      <div className="contest-eligible-grid">
        {options.slice(0, 12).map((item) => {
          const isSelected = selectedIds.includes(item.instanceId);
          const isLocked = Boolean(item.lockState) && !isSelected;
          return (
            <button
              key={item.instanceId}
              type="button"
              className={`contest-eligible-card${isSelected ? " selected" : ""}${isLocked ? " locked" : ""}`}
              onClick={() => onToggle(item.instanceId)}
              disabled={!canManage || isLocked}
            >
              <strong>{item.name}</strong>
              <span>{item.rarityCode} · {item.editionCode}</span>
              <span>{isLocked ? "Locked elsewhere" : item.cardSetCode}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
