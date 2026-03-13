import type { LineupOption } from "@/components/contests/types";

export function EnteredLineupPanel({ selectedCards }: { selectedCards: Array<LineupOption | null> }) {
  return (
    <section className="contest-info-panel">
      <h3 className="contest-section-title">Submitted lineup</h3>
      <div className="contest-selected-lineup">
        {selectedCards.map((card, index) => (
          <div className="lineup-slot filled" key={`${card?.instanceId ?? "empty"}-${index}`}>
            <div className="lineup-slot-main">
              <span className="contest-slot-index">Slot {index + 1}</span>
              <span className="contest-slot-name">{card?.name ?? "Unknown card"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
