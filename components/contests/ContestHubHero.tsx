import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ContestListItem } from "@/components/contests/types";
import { formatCountdown, getTargetDate } from "@/components/contests/contestUtils";

function tone(status: ContestListItem["status"]) {
  if (status === "LIVE") return "live" as const;
  if (status === "OPEN") return "open" as const;
  if (status === "LOCKED") return "locked" as const;
  return "settled" as const;
}

export function ContestHubHero({ contest, nowTs }: { contest: ContestListItem | null; nowTs: number }) {
  if (!contest) {
    return (
      <Surface className="contest-hub-hero">
        <SectionHeader
          eyebrow="Contests"
          title="Competition arena"
          subtitle="Build your lineup and track your rank through lock, live, and settlement."
          actions={<Link href="/collection" className="mcg-btn ghost">Build from collection</Link>}
        />
      </Surface>
    );
  }

  const rosterSize = contest.rules[0]?.maxRosterSize ?? 5;
  const rewardTeaser = `${Math.max(100, rosterSize * 40)} pts + booster chance`;
  const countdown = formatCountdown(getTargetDate(contest.status, contest.lockAt, contest.endsAt), nowTs);

  return (
    <Surface className="contest-hub-hero" variant="raised">
      <div>
        <SectionHeader
          eyebrow="Featured contest"
          title={contest.title}
          subtitle="Sorare-style lineup flow, adapted to MCG collectible cards."
          actions={<StatusBadge tone={tone(contest.status)} label={contest.status} />}
        />
        <div className="contest-hero-meta-row">
          <span className="mcg-chip">Code {contest.code}</span>
          <span className="mcg-chip">Roster {rosterSize}</span>
          <span className="mcg-chip">Entries {contest._count.entries}</span>
          <span className="mcg-chip">Reward {rewardTeaser}</span>
        </div>
      </div>

      <div className="contest-hero-cta-box">
        <p className="mcg-eyebrow">Countdown</p>
        <p className="contest-hero-countdown">{countdown}</p>
        <Link href={`/contests/${contest.id}`} className="mcg-btn primary">Enter featured contest</Link>
      </div>
    </Surface>
  );
}
