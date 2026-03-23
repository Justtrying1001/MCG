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
  const groups = [
    {
      title: "Progression",
      tone: "tone-primary",
      stats: [
        { label: "Milestones unlocked", value: String(milestonesUnlocked) },
        { label: "Total XP", value: totalXp.toLocaleString() },
      ],
    },
    {
      title: "Collection",
      tone: "tone-secondary",
      stats: [{ label: "Collection XP", value: collectionXp.toLocaleString() }],
    },
    {
      title: "Competitive",
      tone: "tone-tertiary",
      stats: [
        { label: "Competitive XP", value: competitiveXp.toLocaleString() },
        { label: "Entered battles", value: String(contestsEntered) },
      ],
    },
    {
      title: "Prestige",
      tone: "tone-neutral",
      stats: [
        { label: "League", value: leagueTier ?? "Unranked" },
        { label: "Rating", value: rating ? String(rating) : "—" },
        { label: "Best rank", value: bestRank ? `#${bestRank}` : "—" },
      ],
    },
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
            Compact account intel for collector progress, battle performance, and prestige.
          </p>
        </div>

        <div className="profile-progression-group-grid">
          {groups.map((group) => (
            <article key={group.title} className={`profile-progression-group ${group.tone}`}>
              <span className="profile-progression-group-label">{group.title}</span>
              <div className="profile-progression-group-stats">
                {group.stats.map((stat) => (
                  <div key={stat.label} className="profile-progression-stat">
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </Surface>
  );
}
