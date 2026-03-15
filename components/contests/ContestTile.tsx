import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import type { ContestListItem } from "@/components/contests/types";
import { formatCountdown, getTargetDate } from "@/components/contests/contestUtils";
import { getActionability, getPhaseLabel, getPrimaryCtaLabel } from "@/components/contests/contestLifecycle";

export function ContestTile({ contest, nowTs }: { contest: ContestListItem; nowTs: number }) {
  const roster = contest.rules[0]?.maxRosterSize ?? 5;
  const rewardPts = Math.max(100, roster * 40);
  const countDown = formatCountdown(getTargetDate(contest.status, contest.lockAt, contest.endsAt), nowTs);
  const actionability = getActionability(contest.status);
  const rarityBadge = contest.status === "LIVE" ? "Legendary" : contest.status === "SETTLED" ? "Elite" : "Classic";

  return (
    <Surface as="article" className="contest-grid-card premium" variant="raised">
      <div className={`contest-grid-card-banner contest-banner-${contest.status.toLowerCase()}`} aria-hidden />
      <div className="contest-grid-card-top">
        <div>
          <p className="mcg-eyebrow">{contest.code}</p>
          <h3 className="contest-grid-card-title">{contest.title}</h3>
        </div>
        <span className={`contest-phase-pill phase-${contest.status.toLowerCase()}`}>{getPhaseLabel(contest.status)}</span>
      </div>

      <div className="contest-grid-card-badges">
        <span className="contest-rarity-badge small">{rarityBadge}</span>
        <span className="mcg-chip">Reward ~{rewardPts} pts</span>
      </div>

      <div className="contest-hero-meta-row compact">
        <span className="mcg-chip">Season {contest.seasonName ?? "Unassigned"}</span>
        <span className="mcg-chip">League {contest.leagueTierRequired ?? "OPEN"}</span>
      </div>

      <div className="contest-grid-card-stats">
        <span>Participants {contest._count.entries}</span>
        <span>Team size {roster}</span>
        <span>{countDown}</span>
      </div>

      <p className="contest-inline-note">{actionability.message}</p>

      <div className="contest-grid-card-footer">
        <Link href={`/contests/${contest.id}`} className="mcg-btn">{getPrimaryCtaLabel(contest.status)} →</Link>
      </div>
    </Surface>
  );
}
