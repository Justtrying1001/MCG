"use client";

import { useEffect, useState } from "react";
import { formatCountdown, getCountdownLabel, getTargetDate } from "@/components/contests/contestUtils";
import type { ContestStatus } from "@/components/contests/types";

export function ContestCountdown({ status, lockAt, endsAt }: { status: ContestStatus; lockAt: string | null; endsAt: string | null }) {
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="contest-timer-row" aria-live="polite">
      <p>{getCountdownLabel(status)}</p>
      <strong>{formatCountdown(getTargetDate(status, lockAt, endsAt), nowTs)}</strong>
    </div>
  );
}
