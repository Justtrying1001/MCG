import { GAME_CONFIG, GAME_DERIVED_STATS } from "@/lib/game-config";

const formatter = new Intl.NumberFormat("en-US");

const STATS = [
  { value: formatter.format(GAME_CONFIG.GENESIS_SET.TOKEN_COUNT), label: "Tokens in Set 1", accent: "cyan" },
  { value: formatter.format(GAME_DERIVED_STATS.TOTAL_PLANNED_CARDS), label: "Cards planned", accent: "pink" },
  { value: formatter.format(GAME_CONFIG.GENESIS_SET.PACK_COUNT), label: "Planned packs", accent: "yellow" },
  { value: "Live", label: "Contest season", accent: "blue" },
] as const;

export function StatsBar() {
  return (
    <section className="home-stats-shell">
      <div className="home-stats-bar" role="list" aria-label="MCG key stats">
        {STATS.map((stat) => (
          <article key={stat.label} className={`home-stats-item home-stats-item--${stat.accent}`.trim()} role="listitem">
            <span className="home-stats-value">{stat.value}</span>
            <span className="home-stats-label">{stat.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
