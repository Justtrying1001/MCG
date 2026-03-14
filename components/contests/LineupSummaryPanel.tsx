import { Surface } from "@/components/ui/Surface";
import type { LineupOption } from "@/components/contests/types";

export function LineupSummaryPanel({ selectedCards, maxRosterSize }: { selectedCards: Array<LineupOption | null>; maxRosterSize: number }) {
  const filled = selectedCards.filter(Boolean).length;
  const remaining = Math.max(0, maxRosterSize - filled);

  return (
    <Surface className="contest-sidebar-panel">
      <p className="mcg-eyebrow">Lineup summary</p>
      <strong>{filled}/{maxRosterSize} filled</strong>
      <p className="contest-inline-note">{remaining} slots remaining</p>
      <div className="contest-summary-list-v2">
        {selectedCards.map((card, index) => (
          <p key={`${card?.instanceId ?? "empty"}-${index}`}>#{index + 1} {card ? card.name : "Empty"}</p>
        ))}
      </div>
    </Surface>
  );
}
