type ContestTab = "upcoming" | "open" | "locked" | "live" | "settled";

export function ContestFiltersBar({ tab, setTab, query, setQuery }: { tab: ContestTab; setTab: (tab: ContestTab) => void; query: string; setQuery: (value: string) => void }) {
  const tabs: Array<{ key: ContestTab; label: string }> = [
    { key: "upcoming", label: "Upcoming" },
    { key: "open", label: "Open for entry" },
    { key: "locked", label: "Locked" },
    { key: "live", label: "Live" },
    { key: "settled", label: "Settled / Results" },
  ];

  return (
    <div className="contest-filters-shell">
      <div className="contest-tabs" role="tablist" aria-label="Contest sections">
        {tabs.map((entry) => (
          <button key={entry.key} type="button" className={`contest-tab${tab === entry.key ? " active" : ""}`} onClick={() => setTab(entry.key)} role="tab" aria-selected={tab === entry.key}>
            {entry.label}
          </button>
        ))}
      </div>
      <input className="filter-input" placeholder="Search contest code or title" value={query} onChange={(event) => setQuery(event.target.value)} />
    </div>
  );
}
