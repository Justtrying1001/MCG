import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCountdown, getTargetDate } from "@/components/contests/contestUtils";
import type { ContestStatus } from "@/components/contests/types";

function tone(status: ContestStatus) {
  if (status === "LIVE") return "live" as const;
  if (status === "OPEN") return "open" as const;
  if (status === "LOCKED") return "locked" as const;
  return "settled" as const;
}

export function ContestHero({
  code,
  title,
  status,
  startsAt,
  lockAt,
  endsAt,
  rosterSize,
  restrictedSet,
  entries,
  nowTs,
  userState,
}: {
  code: string;
  title: string;
  status: ContestStatus;
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  rosterSize: number;
  restrictedSet: boolean;
  entries: number;
  nowTs: number;
  userState: string;
}) {
  const countdown = formatCountdown(getTargetDate(status, lockAt, endsAt), nowTs);
  return (
    <Surface className="contest-detail-hero" variant="raised">
      <div>
        <SectionHeader
          eyebrow={`Contest ${code}`}
          title={title}
          subtitle="Compose your lineup with intention, confirm before lock, and track the race live."
          actions={<StatusBadge tone={tone(status)} label={status} />}
        />

        <div className="contest-hero-meta-row">
          <span className="mcg-chip">Starts {formatDate(startsAt)}</span>
          <span className="mcg-chip">Lock {formatDate(lockAt)}</span>
          <span className="mcg-chip">Ends {formatDate(endsAt)}</span>
          <span className="mcg-chip">Roster {rosterSize}</span>
          <span className="mcg-chip">Entries {entries}</span>
          <span className="mcg-chip">Set {restrictedSet ? "Restricted" : "Any"}</span>
        </div>
      </div>

      <div className="contest-hero-cta-box">
        <p className="mcg-eyebrow">Your status</p>
        <p className="contest-hero-user-state">{userState}</p>
        <p className="contest-hero-countdown">{countdown}</p>
      </div>
    </Surface>
  );
}
