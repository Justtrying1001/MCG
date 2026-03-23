import { Surface } from "@/components/ui/Surface";

type Props = {
  milestonesUnlocked: number;
  totalXp: number;
  contestsEntered: number;
  bestRank: number | null;
  rating: number | null;
  leagueTier?: string | null;
};

export function ContestAchievements({
  milestonesUnlocked,
  totalXp,
  contestsEntered,
  bestRank,
  rating,
  leagueTier,
}: Props) {
  const progressionStats = [
    { label: "Milestones unlocked", value: String(milestonesUnlocked) },
    { label: "Total XP", value: totalXp.toLocaleString() },
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
            <h2>Progression & stats</h2>
          </div>
          <p className="profile-progression-summary">Compact progression on the left, competitive track on the right.</p>
        </div>

        <div className="profile-progression-grid">
          <section className="profile-progression-group">
            <div className="profile-progression-group-head">
              <p className="mcg-eyebrow">Progression</p>
              <strong>Account momentum</strong>
            </div>
            <div className="profile-progression-stat-grid compact profile-progression-stat-grid--duo">
              {progressionStats.map((stat) => (
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
