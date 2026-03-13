import Link from "next/link";

import { formatCountdown, getContestStatusMeta, getCountdownLabel, getTargetDate } from "@/components/contests/contestUtils";
import type { ContestListItem } from "@/components/contests/types";

type Props = {
  contest: ContestListItem;
  nowTs: number;
};

export function ContestTile({ contest, nowTs }: Props) {
  const meta = getContestStatusMeta(contest.status);
  const rule = contest.rules[0];
  const countdown = formatCountdown(getTargetDate(contest.status, contest.lockAt, contest.endsAt), nowTs);

  return (
    <Link href={`/contests/${contest.id}`} className={`contest-tile contest-tile-${meta.tone}`}>
      <div className="contest-tile-head">
        <span className="contest-art" aria-hidden>{meta.icon}</span>
        <div>
          <p className="contest-code">{contest.code}</p>
          <h3 className="contest-title">{contest.title}</h3>
        </div>
        <span className={`contest-status status-${contest.status.toLowerCase()}`}>{meta.label}</span>
      </div>

      <div className="contest-timer-row">
        <p>{getCountdownLabel(contest.status)}</p>
        <strong>{countdown}</strong>
      </div>

      <div className="contest-meta-grid">
        <ContestMeta label="Entries" value={String(contest._count.entries)} />
        <ContestMeta label="Roster" value={String(rule?.maxRosterSize ?? 5)} />
        <ContestMeta label="Reward" value={`${Math.max(50, (rule?.maxRosterSize ?? 5) * 30)} pts`} />
        <ContestMeta label="CTA" value={meta.cta} />
      </div>
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
