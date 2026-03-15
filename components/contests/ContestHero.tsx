import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatDate, formatCountdown, getTargetDate } from "@/components/contests/contestUtils";
import type { ContestStatus } from "@/components/contests/types";
import { getActionability, getPhaseLabel } from "@/components/contests/contestLifecycle";

export function ContestHero({
  code,
  title,
  status,
  liveAt,
  lockAt,
  endsAt,
  rosterSize,
  restrictedSet,
  entries,
  nowTs,
  userState,
  seasonName,
  leagueTierRequired,
}: {
  code: string;
  title: string;
  status: ContestStatus;
  liveAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  rosterSize: number;
  restrictedSet: boolean;
  entries: number;
  nowTs: number;
  userState: string;
  seasonName?: string | null;
  leagueTierRequired?: string | null;
}) {
  const countdown = formatCountdown(getTargetDate(status, lockAt, endsAt), nowTs);
  const actionability = getActionability(status);
  const rewardPool = `${Math.max(100, rosterSize * 40)} pts + rewards`;

  return (
    <Surface className="contest-detail-hero premium" variant="raised">
      <div className={`contest-hero-banner contest-banner-${status.toLowerCase()}`} aria-hidden />
      <div>
        <SectionHeader
          eyebrow={`Contest ${code}`}
          title={title}
          subtitle={actionability.message}
          actions={<span className={`contest-phase-pill phase-${status.toLowerCase()}`}>{getPhaseLabel(status)}</span>}
        />

        <div className="contest-hero-meta-row compact">
          <span className="mcg-chip">Reward pool {rewardPool}</span>
          <span className="mcg-chip">Participants {entries}</span>
          <span className="mcg-chip">Team size {rosterSize}</span>
          <span className="mcg-chip">Set {restrictedSet ? "Restricted" : "Any"}</span>
          <span className="mcg-chip">Season {seasonName ?? "Unassigned"}</span>
          <span className="mcg-chip">League {leagueTierRequired ?? "OPEN"}</span>
        </div>

        <div className="contest-hero-meta-row">
          <span className="mcg-chip">Goes live {formatDate(liveAt)}</span>
          <span className="mcg-chip">Team lock {formatDate(lockAt)}</span>
          <span className="mcg-chip">Ends {formatDate(endsAt)}</span>
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
