const STATS = [
  { value: "50", label: "Cards in Set 1" },
  { value: "16,000", label: "Packs" },
  { value: "5", label: "Rarities" },
  { value: "Live", label: "Contests" },
];

export function StatsBar() {
  return (
    <div className="home-stats-bar" role="list" aria-label="MCG key stats">
      {STATS.map((stat, i) => (
        <div key={i} className="home-stats-item" role="listitem">
          <span className="home-stats-value">{stat.value}</span>
          <span className="home-stats-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
