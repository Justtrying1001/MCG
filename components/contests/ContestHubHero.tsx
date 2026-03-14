import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { ContestListItem } from "@/components/contests/types";
import { formatCountdown, getTargetDate } from "@/components/contests/contestUtils";
import { getPhaseLabel } from "@/components/contests/contestLifecycle";

export function ContestHubHero({ contest, nowTs }: { contest: ContestListItem | null; nowTs: number }) {
  if (!contest) {
    return (
      <Surface className="contest-hub-hero premium">
        <SectionHeader
          eyebrow="Contests"
          title="Competition Arena"
          subtitle="Draft your best lineup, adapt before lock, then watch the race unfold."
          actions={<Link href="/collection" className="mcg-btn ghost">Build from collection</Link>}
        />
      </Surface>
    );
  }

  const rosterSize = contest.rules[0]?.maxRosterSize ?? 5;
  const rewardTeaser = `${Math.max(100, rosterSize * 40)} pts + booster chance`;
  const countdown = formatCountdown(getTargetDate(contest.status, contest.lockAt, contest.endsAt), nowTs);

  return (
    <Surface className="contest-hub-hero premium" variant="raised">
      <div>
        <SectionHeader
          eyebrow="Featured contest"
          title={contest.title}
          subtitle="Premium TCG competition flow: compose, lock, race, settle."
          actions={<span className={`contest-phase-pill phase-${contest.status.toLowerCase()}`}>{getPhaseLabel(contest.status)}</span>}
        />
        <div className="contest-hero-meta-row">
          <span className="mcg-chip">Code {contest.code}</span>
          <span className="mcg-chip">Roster {rosterSize}</span>
          <span className="mcg-chip">Entries {contest._count.entries}</span>
          <span className="mcg-chip">Reward {rewardTeaser}</span>
        </div>
      </div>

      <div className="contest-hero-cta-box">
        <p className="mcg-eyebrow">Next milestone</p>
        <p className="contest-hero-countdown">{countdown}</p>
        <Link href={`/contests/${contest.id}`} className="mcg-btn primary">Enter featured contest</Link>
      </div>
    </Surface>
  );
}
