import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ContestListItem } from "@/components/contests/types";
import { formatCountdown, getTargetDate } from "@/components/contests/contestUtils";

function tone(status: ContestListItem["status"]) {
  if (status === "LIVE") return "live" as const;
  if (status === "OPEN") return "open" as const;
  if (status === "LOCKED") return "locked" as const;
  return "settled" as const;
}

function cta(status: ContestListItem["status"]) {
  if (status === "OPEN") return "Build lineup";
  if (status === "LIVE") return "Track live";
  if (status === "LOCKED") return "View lock";
  return "View result";
}

export function ContestTile({ contest, nowTs }: { contest: ContestListItem; nowTs: number }) {
  const roster = contest.rules[0]?.maxRosterSize ?? 5;
  const rewardPts = Math.max(100, roster * 40);
  const countDown = formatCountdown(getTargetDate(contest.status, contest.lockAt, contest.endsAt), nowTs);

  return (
    <Surface as="article" className="contest-grid-card" variant="raised">
      <div className="contest-grid-card-top">
        <div>
          <p className="mcg-eyebrow">{contest.code}</p>
          <h3 className="contest-grid-card-title">{contest.title}</h3>
        </div>
        <StatusBadge tone={tone(contest.status)} label={contest.status} />
      </div>

      <div className="contest-grid-card-stats">
        <span>Roster {roster}</span>
        <span>Entries {contest._count.entries}</span>
        <span>Reward {rewardPts} pts</span>
      </div>

      <div className="contest-grid-card-footer">
        <p className="contest-countdown-inline">{countDown}</p>
        <Link href={`/contests/${contest.id}`} className="mcg-btn ghost">{cta(contest.status)} →</Link>
      </div>
    </Surface>
  );
}
