import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function ContestAchievements({
  contestsEntered,
  bestRank,
  rating,
}: {
  contestsEntered: number;
  bestRank: number | null;
  rating: number | null;
}) {
  const badges = [
    { label: "Entered", value: String(contestsEntered), icon: "⚔️" },
    { label: "Best rank", value: bestRank ? `#${bestRank}` : "—", icon: "🥇" },
    { label: "Rating", value: rating ? String(rating) : "—", icon: "📈" },
  ];

  return (
    <Surface>
      <div className="profile-achievements-wrap">
        <SectionHeader
          eyebrow="Contest achievements"
          title="Competitive highlights"
          subtitle="Your strongest moments in MCG contests."
        />
        <div className="profile-achievement-grid">
          {badges.map((badge) => (
            <article key={badge.label} className="profile-achievement-item">
              <p>{badge.icon} {badge.label}</p>
              <strong>{badge.value}</strong>
            </article>
          ))}
        </div>
      </div>
    </Surface>
  );
}
