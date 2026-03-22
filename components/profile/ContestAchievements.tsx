import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function ContestAchievements({
  contestsEntered,
  bestRank,
  rating,
  leagueTier,
  seasonRank,
  footer,
}: {
  contestsEntered: number;
  bestRank: number | null;
  rating: number | null;
  leagueTier?: string | null;
  seasonRank?: number | null;
  footer?: ReactNode;
}) {
  const badges = [
    { label: "Entered", value: String(contestsEntered), tone: "primary" },
    {
      label: "Best rank",
      value: bestRank ? `#${bestRank}` : "—",
      tone: "secondary",
    },
    { label: "Rating", value: rating ? String(rating) : "—", tone: "tertiary" },
    { label: "League", value: leagueTier ?? "Unranked", tone: "neutral" },
    {
      label: "Season rank",
      value: seasonRank ? `#${seasonRank}` : "—",
      tone: "neutral",
    },
  ];

  return (
    <Surface variant="raised" className="profile-achievements-surface">
      <div className="profile-achievements-wrap">
        <SectionHeader
          eyebrow="Competitive panel"
          title="Competitive prestige"
          subtitle="Your strongest contest credentials, ladder standing, and season posture in one prestige panel."
        />
        <div className="profile-achievement-grid">
          {badges.map((badge) => (
            <article
              key={badge.label}
              className={`profile-achievement-item tone-${badge.tone}`}
            >
              <p>{badge.label}</p>
              <strong>{badge.value}</strong>
            </article>
          ))}
        </div>
        {footer ? <div style={{ marginTop: "1rem" }}>{footer}</div> : null}
      </div>
    </Surface>
  );
}
