import Link from "next/link";
import type { ContestListItem } from "@/components/contests/types";
import { formatCountdown } from "@/components/contests/contestUtils";

type ArenaStatus = "OPEN" | "LIVE" | "FINISHED";

function toArenaStatus(status: ContestListItem["status"]): ArenaStatus {
  if (status === "SETTLED") return "FINISHED";
  if (status === "OPEN") return "OPEN";
  return "LIVE";
}

function getTimerMeta(contest: ContestListItem) {
  if (contest.status === "OPEN") {
    return { label: "Registration ends in", target: contest.lockAt };
  }
  if (contest.status === "LOCKED" || contest.status === "LIVE") {
    return { label: "Contest ends in", target: contest.endsAt };
  }
  return { label: "Contest ended", target: null as string | null };
}

function getCta(status: ArenaStatus) {
  if (status === "OPEN") return "Join contest";
  if (status === "LIVE") return "View contest";
  return "View results";
}

function getRewardLabel(contest: ContestListItem) {
  if (contest.rewardPreview?.label) return contest.rewardPreview.label;
  if (contest.rewardPreview?.amount) return `${contest.rewardPreview.amount.toLocaleString()} pts`;
  return "Rewards configured";
}

export function ContestCard({ contest, nowTs }: { contest: ContestListItem; nowTs: number }) {
  const status = toArenaStatus(contest.status);
  const rule = contest.rules[0];
  const timer = getTimerMeta(contest);
  const countdown = timer.target ? formatCountdown(timer.target, nowTs) : "—";
  const entryFee = rule?.entryFeeEnabled ? `${rule.entryFeeAmount ?? 0} pts` : "Free";

  return (
    <article className={`contest-arena-card tone-${status.toLowerCase()}`}>
      <div className="contest-arena-card-banner" aria-hidden>
        <span>{contest.code}</span>
      </div>

      <div className="contest-arena-card-body">
        <div className="contest-arena-card-top">
          <h3>{contest.title}</h3>
          <span className={`contest-arena-badge badge-${status.toLowerCase()}`}>
            {status}
            {status === "LIVE" ? <i className="contest-live-dot" aria-hidden /> : null}
          </span>
        </div>

        <div className="contest-arena-info-grid">
          <div>
            <small>{timer.label}</small>
            <strong className="contest-arena-countdown-fixed">{countdown}</strong>
          </div>
          <div>
            <small>Rewards</small>
            <strong className="reward reward-summary">{getRewardLabel(contest)}</strong>
          </div>
          <div>
            <small>Participants</small>
            <strong>{contest._count.entries}</strong>
          </div>
          <div>
            <small>Entry fee</small>
            <strong>{entryFee}</strong>
          </div>
        </div>

        <Link href={`/contests/${contest.id}`} className="contest-arena-cta" aria-label={`Open contest ${contest.title}`}>
          {getCta(status)}
        </Link>
      </div>
    </article>
  );
}
