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

  return (
    <Surface as="article" className="contest-grid-card premium" variant="raised">
      <div className="contest-grid-card-top">
        <div>
          <p className="mcg-eyebrow">{contest.code}</p>
          <h3 className="contest-grid-card-title">{contest.title}</h3>
        </div>
        <span className={`contest-phase-pill phase-${contest.status.toLowerCase()}`}>{getPhaseLabel(contest.status)}</span>
      </div>

      <div className="contest-grid-card-stats">
        <span>Roster {roster}</span>
        <span>Entries {contest._count.entries}</span>
        <span>Reward ~{rewardPts} pts</span>
      </div>

      <p className="contest-inline-note">{actionability.message}</p>

      <div className="contest-grid-card-footer">
        <p className="contest-countdown-inline">{countDown}</p>
        <Link href={`/contests/${contest.id}`} className="mcg-btn">{getPrimaryCtaLabel(contest.status)} →</Link>
      </div>
    </Surface>
  );
}
