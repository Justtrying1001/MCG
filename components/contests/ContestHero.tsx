import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatDate, formatCountdown, getTargetDate } from "@/components/contests/contestUtils";
import type { ContestStatus } from "@/components/contests/types";
import { getActionability, getPhaseLabel } from "@/components/contests/contestLifecycle";

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
  const actionability = getActionability(status);
  return (
    <Surface className="contest-detail-hero premium" variant="raised">
      <div>
        <SectionHeader
          eyebrow={`Contest ${code}`}
          title={title}
          subtitle={actionability.message}
          actions={<span className={`contest-phase-pill phase-${status.toLowerCase()}`}>{getPhaseLabel(status)}</span>}
        />

        <div className="contest-hero-meta-row">
          <span className="mcg-chip">Starts {formatDate(startsAt)}</span>
          <span className="mcg-chip">Team lock {formatDate(lockAt)}</span>
          <span className="mcg-chip">Ends {formatDate(endsAt)}</span>
          <span className="mcg-chip">Roster {rosterSize}</span>
          <span className="mcg-chip">Entries {entries}</span>
          <span className="mcg-chip">Set {restrictedSet ? "Restricted" : "Any"}</span>
        </div>
      </div>

      <div className="contest-hero-cta-box">
        <p className="mcg-eyebrow">What you can do now</p>
        <p className="contest-hero-user-state">{userState}</p>
        <p className="contest-hero-countdown">{countdown}</p>
      </div>
    </Surface>
  );
}
