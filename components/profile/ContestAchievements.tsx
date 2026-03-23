import { Surface } from "@/components/ui/Surface";

type Props = {
  competitiveXp: number;
  contestsEntered: number;
  contestsWon: number;
  bestRank: number | null;
  averageRank: number | null;
  rating: number | null;
  leagueTier?: string | null;
};

export function ContestAchievements({
  competitiveXp,
  contestsEntered,
  contestsWon,
  bestRank,
  averageRank,
  rating,
  leagueTier,
}: Props) {
  const stats = [
    { label: "Entered battles", value: String(contestsEntered), tone: "tone-tertiary" },
    { label: "Rating", value: rating ? rating.toLocaleString() : "—", tone: "tone-primary" },
    { label: "League", value: leagueTier ?? "Unranked", tone: "tone-secondary" },
    { label: "Best rank", value: bestRank ? `#${bestRank}` : "—", tone: "tone-neutral" },
    { label: "Wins", value: contestsWon.toLocaleString(), tone: "tone-tertiary" },
    { label: "Avg. finish", value: averageRank ? `#${averageRank.toFixed(1)}` : "—", tone: "tone-neutral" },
    { label: "Competitive XP", value: competitiveXp.toLocaleString(), tone: "tone-primary" },
  ];

  return (
    <Surface variant="raised" className="profile-progression-surface">
      <div className="profile-progression-wrap">
        <div className="profile-section-heading profile-progression-heading">
          <div>
            <h2>Battle Stats</h2>
          </div>
        </div>

        <div className="profile-progression-stat-grid profile-progression-stat-grid--battle">
          {stats.map((stat) => (
            <article key={stat.label} className={`profile-progression-stat ${stat.tone}`}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </div>
      </div>
    </Surface>
  );
}
