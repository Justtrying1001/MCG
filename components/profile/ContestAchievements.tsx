import { Surface } from "@/components/ui/Surface";

type Props = {
  milestonesUnlocked: number;
  pointsXp: number;
  competitiveXp: number;
  collectionXp: number;
  contestsEntered: number;
  bestRank: number | null;
  rating: number | null;
  leagueTier?: string | null;
};

export function ContestAchievements({
  milestonesUnlocked,
  pointsXp,
  competitiveXp,
  collectionXp,
  contestsEntered,
  bestRank,
  rating,
  leagueTier,
}: Props) {
  const globalStats = [
    { label: "Milestones unlocked", value: String(milestonesUnlocked) },
    { label: "Points XP", value: pointsXp.toLocaleString() },
    { label: "Competitive XP", value: competitiveXp.toLocaleString() },
    { label: "Collection XP", value: collectionXp.toLocaleString() },
  ];

  const competitiveStats = [
    { label: "Entered", value: String(contestsEntered) },
    { label: "Best rank", value: bestRank ? `#${bestRank}` : "—" },
    { label: "Rating", value: rating ? String(rating) : "—" },
    { label: "League", value: leagueTier ?? "Unranked" },
  ];

  return (
    <Surface variant="raised" className="profile-progression-surface">
      <div className="profile-progression-wrap">
        <div className="profile-section-heading profile-progression-heading">
          <div>
            <p className="mcg-eyebrow">Progression & stats</p>
            <h2>Progression</h2>
          </div>
          <p className="profile-progression-summary">One compact view for your account momentum and competitive track.</p>
        </div>

        <div className="profile-progression-grid">
          <section className="profile-progression-group">
            <div className="profile-progression-group-head">
              <p className="mcg-eyebrow">Global progression</p>
              <strong>Identity growth</strong>
            </div>
            <div className="profile-progression-stat-grid compact">
              {globalStats.map((stat) => (
                <article key={stat.label} className="profile-progression-stat">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="profile-progression-group">
            <div className="profile-progression-group-head">
              <p className="mcg-eyebrow">Competitive</p>
              <strong>Battle profile</strong>
            </div>
            <div className="profile-progression-stat-grid compact">
              {competitiveStats.map((stat) => (
                <article key={stat.label} className="profile-progression-stat">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Surface>
  );
}
