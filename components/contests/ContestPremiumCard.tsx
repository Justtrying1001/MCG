import Link from "next/link";
import type { ContestListItem } from "@/components/contests/types";
import { Surface } from "@/components/ui/Surface";
import { getPhaseLabel, getPrimaryCtaLabel } from "@/components/contests/contestLifecycle";
import { formatCountdown, getTargetDate } from "@/components/contests/contestUtils";

function formatDate(value: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
      </div>

      <div className="contest-premium-card-body">
        <div className="contest-premium-card-top">
          <p className="contest-premium-code">{contest.code}</p>
          <span className={`contest-phase-pill phase-${contest.status.toLowerCase()}`}>{getPhaseLabel(contest.status)}</span>
        </div>

        <h3 title={contest.title}>{contest.title}</h3>

        <div className="contest-premium-meta">
          <span>{timingLabel}: {formatDate(contest.status === "OPEN" ? contest.lockAt : contest.endsAt)}</span>
          <span>Countdown: {countdown}</span>
          <span>Reward: {rewardPreview}</span>
          <span>Participants: {contest._count.entries}</span>
          <span>Lineup: {rosterSize} cards</span>
        </div>

        <div className="contest-premium-footer">
          <span className="contest-premium-league">{contest.leagueTierRequired ?? "OPEN LEAGUE"}</span>
          <Link href={`/contests/${contest.id}`} className="mcg-btn">
            {getPrimaryCtaLabel(contest.status)}
          </Link>
        </div>
      </div>
    </Surface>
  );
}
