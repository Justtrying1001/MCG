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
    { label: "Entered battles", value: contestsEntered > 0 ? String(contestsEntered) : "—", detail: contestsEntered > 0 ? "Participations logged" : "No participation yet", tone: "tone-tertiary" },
    { label: "Rating", value: rating ? rating.toLocaleString() : "—", detail: rating ? "Current ladder rating" : "No rating yet", tone: "tone-primary" },
    { label: "League", value: leagueTier ?? "Unranked", detail: leagueTier ? "Current bracket" : "No tier assigned", tone: "tone-secondary" },
    { label: "Best rank", value: bestRank ? `#${bestRank}` : "—", detail: bestRank ? "Best finish to date" : "No finish yet", tone: "tone-neutral" },
    { label: "Wins", value: contestsWon > 0 ? contestsWon.toLocaleString() : "—", detail: contestsWon > 0 ? "Total wins secured" : "No wins yet", tone: "tone-tertiary" },
    { label: "Avg. finish", value: averageRank ? `#${averageRank.toFixed(1)}` : "—", detail: averageRank ? "Mean final placement" : "No average yet", tone: "tone-neutral" },
    { label: "Competitive XP", value: competitiveXp > 0 ? competitiveXp.toLocaleString() : "—", detail: competitiveXp > 0 ? "Battle-earned XP" : "No XP yet", tone: "tone-primary" },
  ];

  return (
    <Surface variant="raised" className="profile-progression-surface">
      <div className="profile-progression-wrap">
        <div className="profile-section-heading profile-progression-heading">
          <div>
            <span className="profile-section-chip">Battle Stats</span>
            <h2>Battle Stats</h2>
          </div>
        </div>

        <div className="profile-progression-stat-grid profile-progression-stat-grid--battle">
          {stats.map((stat) => (
            <article key={stat.label} className={`profile-progression-stat ${stat.tone}`}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.detail}</small>
            </article>
          ))}
        </div>
      </div>
    </Surface>
  );
}
