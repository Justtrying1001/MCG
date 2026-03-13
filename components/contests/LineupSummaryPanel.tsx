import type { LineupOption } from "@/components/contests/types";

export function LineupSummaryPanel({ selectedCards, maxRosterSize }: { selectedCards: Array<LineupOption | null>; maxRosterSize: number }) {
  const filled = selectedCards.filter(Boolean).length;
  const remaining = Math.max(0, maxRosterSize - filled);

  return (
    <aside className="contest-info-panel">
      <h4 className="contest-section-title">Lineup Summary</h4>
      <p className="contest-inline-note">{filled}/{maxRosterSize} slots filled · {remaining} remaining</p>
      <div className="contest-summary-list">
        {selectedCards.map((card, index) => (
          <p key={`${card?.instanceId ?? "empty"}-${index}`} className="contest-inline-note">#{index + 1} {card ? card.name : "Empty"}</p>
        ))}
      </div>
    </aside>
  );
}
