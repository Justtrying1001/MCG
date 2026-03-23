import { Surface } from "@/components/ui/Surface";
import type { ContestStatus } from "@/components/contests/types";
import { getPhaseLabel } from "@/components/contests/contestLifecycle";
import { formatCountdown, formatDate, getTargetDate } from "@/components/contests/contestUtils";

export function ContestStatsGrid({
  status,
  liveAt,
  lockAt,
  endsAt,
  rosterSize,
  entries,
  rewardPoints,
  nowTs,
}: {
  status: ContestStatus;
  liveAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  rosterSize: number;
  entries: number;
  rewardPoints: number;
  nowTs: number;
}) {
  const nextMilestone = formatCountdown(getTargetDate(status, lockAt, endsAt), nowTs);

  const cards = [
    { label: "Phase", value: getPhaseLabel(status), hint: "Current tournament step" },
    { label: "Entries", value: String(entries), hint: "Registered lineups" },
    { label: "Roster Size", value: `${rosterSize} cards`, hint: "Required lineup size" },
    { label: "Reward", value: `${rewardPoints} pts`, hint: "Base reward preview" },
    { label: "Goes Live", value: formatDate(liveAt), hint: "Battle goes live" },
    { label: "Team Lock", value: formatDate(lockAt), hint: "Lineup freeze time" },
    { label: "Ends", value: formatDate(endsAt), hint: "Scoring cutoff" },
    { label: "Next Milestone", value: nextMilestone, hint: status === "OPEN" ? "Time to lock" : "Time to end" },
  ];

  return (
    <Surface className="contest-stats-grid-panel" variant="raised">
      <div className="contest-stats-grid-head">
        <p className="mcg-eyebrow">Tournament intelligence</p>
        <strong>At-a-glance battle stats</strong>
      </div>
      <div className="contest-stats-grid">
        {cards.map((card) => (
          <article key={card.label} className="contest-stat-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.hint}</small>
          </article>
        ))}
      </div>
    </Surface>
  );
}
