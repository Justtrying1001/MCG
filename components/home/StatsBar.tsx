import { GAME_CONFIG, GAME_DERIVED_STATS } from "@/lib/game-config";

const formatter = new Intl.NumberFormat("en-US");

const STATS = [
  { value: formatter.format(GAME_CONFIG.GENESIS_SET.TOKEN_COUNT), label: "Tokens in Set 1" },
  { value: formatter.format(GAME_DERIVED_STATS.TOTAL_PLANNED_CARDS), label: "Cards planned" },
  { value: formatter.format(GAME_CONFIG.GENESIS_SET.PACK_COUNT), label: "Packs" },
  { value: "Live", label: "Contests" },
] as const;

export function StatsBar() {
  return (
    <div className="home-stats-bar" role="list" aria-label="MCG key stats">
      {STATS.map((stat) => (
        <div key={stat.label} className="home-stats-item" role="listitem">
          <span className="home-stats-value">{stat.value}</span>
          <span className="home-stats-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
