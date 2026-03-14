import { Surface } from "@/components/ui/Surface";
import type { ContestStatus } from "@/components/contests/types";
import { getActionability, getPhaseLabel } from "@/components/contests/contestLifecycle";
import { formatCountdown, getTargetDate } from "@/components/contests/contestUtils";

export function ContestActionPanel({
  status,
  lockAt,
  endsAt,
  nowTs,
  isGuest,
  lineupFilled,
  rosterSize,
}: {
  status: ContestStatus;
  lockAt: string | null;
  endsAt: string | null;
  nowTs: number;
  isGuest: boolean;
  lineupFilled: number;
  rosterSize: number;
}) {
  const actionability = getActionability(status);
  const countdown = formatCountdown(getTargetDate(status, lockAt, endsAt), nowTs);
  const lineupReady = lineupFilled === rosterSize;

  return (
    <Surface className="contest-sidebar-panel contest-action-panel" variant="raised">
      <p className="mcg-eyebrow">What you can do now</p>
      <strong>{getPhaseLabel(status)}</strong>
      <p className="contest-inline-note">{actionability.message}</p>

      <div className="contest-action-list">
        <div>
          <span>Lineup readiness</span>
          <strong className={lineupReady ? "ready" : "pending"}>{lineupFilled}/{rosterSize}</strong>
        </div>
        <div>
          <span>Countdown</span>
          <strong>{countdown}</strong>
        </div>
        <div>
          <span>Entry mode</span>
          <strong>{isGuest ? "Preview only" : actionability.editable ? "Editable" : "Locked"}</strong>
        </div>
      </div>
    </Surface>
  );
}
