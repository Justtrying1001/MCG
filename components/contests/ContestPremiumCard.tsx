import Link from "next/link";
import type { ContestListItem } from "@/components/contests/types";
import { Surface } from "@/components/ui/Surface";
import { getPhaseLabel, getPrimaryCtaLabel } from "@/components/contests/contestLifecycle";
import { formatCountdown, getTargetDate } from "@/components/contests/contestUtils";

function formatDate(value: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVisualToken(contest: ContestListItem) {
  const fallback = (contest.code || "MCG").slice(0, 3).toUpperCase();
  return contest.seasonName?.slice(0, 3).toUpperCase() ?? fallback;
}

export function ContestPremiumCard({ contest, nowTs }: { contest: ContestListItem; nowTs: number }) {
  const rosterSize = contest.rules[0]?.maxRosterSize ?? 5;
  const rewardPreview = `${Math.max(120, rosterSize * 45)} pts`;
  const countdown = formatCountdown(getTargetDate(contest.status, contest.lockAt, contest.endsAt), nowTs);
  const timingLabel = contest.status === "OPEN" ? "Lock" : contest.status === "SETTLED" ? "Ended" : "Ends";
  const visualToken = getVisualToken(contest);

  return (
    <Surface as="article" variant="raised" className={`contest-premium-card tone-${contest.status.toLowerCase()}`}>
      <div className="contest-premium-card-art" aria-hidden>
        <span>{visualToken}</span>
        <small>{contest.seasonName ?? "MCG Arena"}</small>
      </div>

      <div className="contest-premium-card-body">
        <div className="contest-premium-card-top">
          <p className="contest-premium-code">{contest.code}</p>
          <span className={`contest-phase-pill phase-${contest.status.toLowerCase()}`}>{getPhaseLabel(contest.status)}</span>
        </div>

        <h3 title={contest.title}>{contest.title}</h3>

        <div className="contest-premium-meta-grid" aria-label="Contest quick stats">
          <span><b>{timingLabel}</b>{formatDate(contest.status === "OPEN" ? contest.lockAt : contest.endsAt)}</span>
          <span><b>Countdown</b>{countdown}</span>
          <span><b>Reward</b>{rewardPreview}</span>
          <span><b>Players</b>{contest._count.entries}</span>
          <span><b>Lineup</b>{rosterSize} cards</span>
          <span><b>League</b>{contest.leagueTierRequired ?? "OPEN"}</span>
        </div>

        <div className="contest-premium-footer">
          <Link href={`/contests/${contest.id}`} className="mcg-btn contest-premium-cta">
            {getPrimaryCtaLabel(contest.status)}
          </Link>
        </div>
      </div>
    </Surface>
  );
}
