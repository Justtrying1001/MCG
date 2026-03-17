"use client";

export type ContestTabKey = "OPEN" | "LIVE" | "FINISHED";

const tabs: Array<{ key: ContestTabKey; label: string }> = [
  { key: "OPEN", label: "Open" },
  { key: "LIVE", label: "Live" },
  { key: "FINISHED", label: "Finished" },
];

export function ContestTabs({
  active,
  counts,
  onChange,
}: {
  active: ContestTabKey;
  counts: Record<ContestTabKey, number>;
  onChange: (tab: ContestTabKey) => void;
}) {
  return (
    <div className="contest-arena-tabs" role="tablist" aria-label="Contest status filter">
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={`contest-arena-tab ${selected ? "active" : ""}`.trim()}
          >
            <span>{tab.label}</span>
            <strong>{counts[tab.key]}</strong>
            <i className="contest-arena-tab-glow" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
