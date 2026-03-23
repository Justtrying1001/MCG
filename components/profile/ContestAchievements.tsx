import { Surface } from "@/components/ui/Surface";

type Props = {
  milestonesUnlocked: number;
  totalXp: number;
  collectionXp: number;
  competitiveXp: number;
  contestsEntered: number;
  bestRank: number | null;
  rating: number | null;
  leagueTier?: string | null;
};

export function ContestAchievements({
  milestonesUnlocked,
  totalXp,
  collectionXp,
  competitiveXp,
  contestsEntered,
  bestRank,
  rating,
  leagueTier,
}: Props) {
  const stats = [
    { label: "Milestones unlocked", value: String(milestonesUnlocked), tone: "tone-primary" },
    { label: "Total XP", value: totalXp.toLocaleString(), tone: "tone-secondary" },
    { label: "Collection XP", value: collectionXp.toLocaleString(), tone: "tone-tertiary" },
    { label: "Competitive XP", value: competitiveXp.toLocaleString(), tone: "tone-neutral" },
    { label: "Entered battles", value: String(contestsEntered), tone: "tone-neutral" },
    { label: "Best rank", value: bestRank ? `#${bestRank}` : "—", tone: "tone-primary" },
    { label: "Rating", value: rating ? String(rating) : "—", tone: "tone-secondary" },
    { label: "League", value: leagueTier ?? "Unranked", tone: "tone-tertiary" },
  ];

  return (
    <Surface variant="raised" className="profile-progression-surface">
      <div className="profile-progression-wrap">
        <div className="profile-section-heading profile-progression-heading">
          <div>
            <p className="mcg-eyebrow">Progression / stats</p>
            <h2>Progression & stats</h2>
          </div>
          <p className="profile-progression-summary">
            One compact panel for collector momentum, competitive prestige, and overall account progress.
          </p>
        </div>

        <div className="profile-progression-stat-grid profile-progression-stat-grid--full">
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
