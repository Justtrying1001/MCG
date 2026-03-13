import { formatCountdown, getCountdownLabel, getTargetDate } from "@/components/contests/contestUtils";
import type { ContestStatus } from "@/components/contests/types";

export function ContestCountdown({ status, lockAt, endsAt, nowTs }: { status: ContestStatus; lockAt: string | null; endsAt: string | null; nowTs: number }) {
  return (
    <div className="contest-timer-row" aria-live="polite">
      <p>{getCountdownLabel(status)}</p>
      <strong>{formatCountdown(getTargetDate(status, lockAt, endsAt), nowTs)}</strong>
    </div>
  );
}
