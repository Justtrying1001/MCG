import Link from "next/link";

import { ContestCountdown } from "@/components/contests/ContestCountdown";
import { ContestRewardPreview } from "@/components/contests/ContestRewardPreview";
import { ContestStatusBadge } from "@/components/contests/ContestStatusBadge";
import { getContestStatusMeta } from "@/components/contests/contestUtils";
import type { ContestListItem } from "@/components/contests/types";

type Props = {
  contest: ContestListItem;
  nowTs: number;
};

export function ContestTile({ contest, nowTs }: Props) {
  const meta = getContestStatusMeta(contest.status);
  const rule = contest.rules[0];

  return (
    <Link href={`/contests/${contest.id}`} className={`contest-tile contest-tile-${meta.tone}`}>
      <div className="contest-tile-head">
        <span className="contest-art" aria-hidden>{meta.icon}</span>
        <div>
          <p className="contest-code">{contest.code}</p>
          <h3 className="contest-title">{contest.title}</h3>
        </div>
        <ContestStatusBadge status={contest.status} />
      </div>

      <ContestCountdown status={contest.status} lockAt={contest.lockAt} endsAt={contest.endsAt} nowTs={nowTs} />

      <div className="contest-meta-grid">
        <ContestMeta label="Entries" value={String(contest._count.entries)} />
        <ContestMeta label="Roster" value={String(rule?.maxRosterSize ?? 5)} />
        <ContestMeta label="Restriction" value={rule?.cardSetId ? "Set locked" : "Any set"} />
        <ContestMeta label="Action" value={meta.cta} />
      </div>

      <ContestRewardPreview rosterSize={rule?.maxRosterSize ?? 5} entries={contest._count.entries} />
      <p className="contest-cta">{meta.cta} →</p>
    </Link>
  );
}

function ContestMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="contest-meta-label">{label}</p>
      <p className="contest-meta-value">{value}</p>
    </div>
  );
}
