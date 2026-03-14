export type ContestHubTab = "OPEN" | "IN_PROGRESS" | "FINISHED";

const items: Array<{ key: ContestHubTab; label: string }> = [
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "FINISHED", label: "Finished" },
];

export function ContestStatusSegmented({
  active,
  counts,
  onChange,
}: {
  active: ContestHubTab;
  counts: Record<ContestHubTab, number>;
  onChange: (next: ContestHubTab) => void;
}) {
  return (
    <div className="contest-status-segmented" role="tablist" aria-label="Contest status">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={active === item.key}
          className={`contest-status-segment ${active === item.key ? "active" : ""}`.trim()}
          onClick={() => onChange(item.key)}
        >
          <span>{item.label}</span>
          <strong>{counts[item.key]}</strong>
        </button>
      ))}
    </div>
  );
}
