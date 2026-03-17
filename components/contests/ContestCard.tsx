import Link from "next/link";
import type { ContestListItem } from "@/components/contests/types";
import { formatCountdown } from "@/components/contests/contestUtils";

type ArenaStatus = "OPEN" | "LIVE" | "FINISHED";

function toArenaStatus(status: ContestListItem["status"]): ArenaStatus {
  if (status === "SETTLED") return "FINISHED";
  if (status === "OPEN") return "OPEN";
  return "LIVE";
}

function formatDate(value: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTargetDate(contest: ContestListItem) {
  if (contest.status === "OPEN") return contest.lockAt;
  if (contest.status === "LIVE" || contest.status === "LOCKED") return contest.endsAt;
  return contest.endsAt;
}

function getTimelineProgress(contest: ContestListItem, nowTs: number) {
  const start = new Date(contest.liveAt ?? contest.lockAt ?? 0).getTime();
  const end = new Date(contest.endsAt ?? 0).getTime();
  if (!start || !end || end <= start) return contest.status === "SETTLED" ? 100 : 18;
  const progress = ((nowTs - start) / (end - start)) * 100;
  if (contest.status === "SETTLED") return 100;
  return Math.max(8, Math.min(100, Math.round(progress)));
}

function getCta(status: ArenaStatus) {
  if (status === "LIVE") return "Enter now";
  if (status === "OPEN") return "Join contest";
  return "View results";
}

export function ContestCard({ contest, nowTs }: { contest: ContestListItem; nowTs: number }) {
  const status = toArenaStatus(contest.status);
  const rule = contest.rules[0];
  const countdown = formatCountdown(getTargetDate(contest), nowTs);
  const reward = contest.rewardPreview?.amount ? `${contest.rewardPreview.amount} pts` : "TBA";
  const entryFee = rule?.entryFeeEnabled ? `${rule.entryFeeAmount ?? 0} pts` : "Free";
  const progress = getTimelineProgress(contest, nowTs);

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
            <small>Ends in</small>
            <strong>{countdown}</strong>
          </div>
          <div>
            <small>Reward pool</small>
            <strong className="reward">{reward}</strong>
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

        <div className="contest-arena-progress-wrap">
          <div className="contest-arena-progress-label">
            <span>{formatDate(getTargetDate(contest))}</span>
            <strong>{progress}%</strong>
          </div>
          <div className="contest-arena-progress-track" aria-hidden>
            <div className="contest-arena-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Link href={`/contests/${contest.id}`} className="contest-arena-cta" aria-label={`Open contest ${contest.title}`}>
          {getCta(status)}
        </Link>
      </div>
    </article>
  );
}
