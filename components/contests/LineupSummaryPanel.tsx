import { Surface } from "@/components/ui/Surface";
import type { LineupOption } from "@/components/contests/types";

export function LineupSummaryPanel({ selectedCards, maxRosterSize }: { selectedCards: Array<LineupOption | null>; maxRosterSize: number }) {
  const filled = selectedCards.filter(Boolean).length;
  const remaining = Math.max(0, maxRosterSize - filled);
  const pct = Math.round((filled / Math.max(1, maxRosterSize)) * 100);

  return (
    <Surface className="contest-sidebar-panel lineup-summary-panel" variant="raised">
      <p className="mcg-eyebrow">Lineup summary</p>
      <strong>{filled}/{maxRosterSize} slots locked-in</strong>
      <p className="contest-inline-note">{remaining === 0 ? "Lineup complete. Ready to save." : `${remaining} slots remaining.`}</p>
      <div className="contest-lineup-progress-track"><span style={{ width: `${pct}%` }} /></div>
      <div className="contest-summary-list-v2">
        {selectedCards.map((card, index) => (
          <p key={`${card?.instanceId ?? "empty"}-${index}`} className={card ? "filled" : "empty"}>
            <span>#{index + 1}</span>
            <strong>{card ? card.name : "Empty slot"}</strong>
          </p>
        ))}
      </div>
    </Surface>
  );
}
