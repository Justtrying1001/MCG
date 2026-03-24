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
  const rule = contest.rules[0];
  const rosterSize = rule?.maxRosterSize ?? 5;
  const rewardPreview = contest.rewardPreview?.amount ? `${contest.rewardPreview.amount} pts` : `${Math.max(120, rosterSize * 45)} pts`;
  const countdown = formatCountdown(getTargetDate(contest.status, contest.lockAt, contest.endsAt), nowTs);
  const timingLabel = contest.status === "OPEN" ? "Lock" : contest.status === "SETTLED" ? "Ended" : "Ends";
  const visualToken = getVisualToken(contest);
  const entryFee = rule?.entryFeeEnabled ? `${rule.entryFeeAmount ?? 0} pts` : "Free";

  const userState = contest.userEntry
    ? contest.status === "OPEN"
      ? "Lineup submitted"
      : contest.status === "SETTLED"
        ? "Results available"
        : "Entry live"
    : "No lineup";

  return (
    <Link href={`/contests/${contest.id}`} className="contest-premium-link-wrap" aria-label={`Open battle ${contest.title}`}>
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

          <div className="contest-premium-meta-grid" aria-label="Battle quick stats">
            <span><b>{timingLabel}</b>{formatDate(contest.status === "OPEN" ? contest.lockAt : contest.endsAt)}</span>
            <span><b>Countdown</b>{countdown}</span>
            <span><b>Reward</b>{rewardPreview}</span>
            <span><b>Entry fee</b>{entryFee}</span>
            <span><b>Participants</b>{contest._count.entries}</span>
            <span><b>Lineup</b>{rosterSize} cards</span>
            <span><b>Your status</b>{userState}</span>
            <span><b>League</b>{contest.leagueTierRequired ?? "Open to all"}</span>
          </div>

          <div className="contest-premium-footer">
            <span className="mcg-btn contest-premium-cta">{getPrimaryCtaLabel(contest.status)}</span>
          </div>
        </div>
      </Surface>
    </Link>
  );
}
