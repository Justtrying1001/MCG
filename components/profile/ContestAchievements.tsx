import { Surface } from "@/components/ui/Surface";

type Props = {
  collectionXp: number;
  competitiveXp: number;
  contestsEntered: number;
  rating: number | null;
  leagueTier?: string | null;
};

export function ContestAchievements({
  collectionXp,
  competitiveXp,
  contestsEntered,
  rating,
  leagueTier,
}: Props) {
  const stats = [
    { label: "Competitive XP", value: competitiveXp.toLocaleString(), tone: "tone-primary" },
    { label: "Collection XP", value: collectionXp.toLocaleString(), tone: "tone-secondary" },
    { label: "Entered battles", value: String(contestsEntered), tone: "tone-tertiary" },
    { label: "Rating / League", value: `${rating ? rating.toLocaleString() : "—"} · ${leagueTier ?? "Unranked"}`, tone: "tone-neutral" },
  ];

  return (
    <Surface variant="raised" className="profile-progression-surface">
      <div className="profile-progression-wrap">
        <div className="profile-section-heading profile-progression-heading">
          <div>
            <p className="mcg-eyebrow">Competitive / progression</p>
            <h2>Competitive progression</h2>
          </div>
          <p className="profile-progression-summary">
            Tight read on match momentum and collector growth — without repeating the trainer card.
          </p>
        </div>

        <div className="profile-progression-stat-grid profile-progression-stat-grid--compact">
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
