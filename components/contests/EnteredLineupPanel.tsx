import { Surface } from "@/components/ui/Surface";
import type { LineupOption } from "@/components/contests/types";

export function EnteredLineupPanel({ selectedCards }: { selectedCards: Array<LineupOption | null> }) {
  return (
    <Surface className="contest-entered-panel" variant="highlight">
      <p className="mcg-eyebrow">Submitted lineup</p>
      <h3 className="mcg-title">Current saved roster</h3>
      <div className="contest-entered-grid">
        {selectedCards.map((card, index) => (
          <div key={`${card?.instanceId ?? "empty"}-${index}`} className="contest-entered-item">
            <span>Slot {index + 1}</span>
            <strong>{card?.name ?? "Empty"}</strong>
          </div>
        ))}
      </div>
    </Surface>
  );
}
