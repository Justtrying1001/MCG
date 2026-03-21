import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getContestStateMessaging, getPrimaryCtaLabel } from "@/components/contests/contestLifecycle";

type ContestListItem = {
  id: string;
  code: string;
  title: string;
  status: "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
  lockAt: string | null;
  seasonName?: string | null;
  rewardPreview?: {
    label: string;
    amount: number | null;
  } | null;
  userEntry?: {
    id: string;
    status: string;
  } | null;
  _count: { entries: number };
};

function toTone(status: ContestListItem["status"]) {
  if (status === "LIVE") return "live" as const;
  if (status === "OPEN") return "open" as const;
  if (status === "LOCKED") return "locked" as const;
  return "settled" as const;
}

export function ActiveContestsRail({ contests }: { contests: ContestListItem[] }) {
  return (
    <Surface variant="raised" className="active-contests-panel">
      <div className="mcg-home-section">
        <SectionHeader
          eyebrow="Lobby queue"
          title="Active contests"
          subtitle="Jump into live windows and review where you already have an entry."
          actions={<Link href="/contests" className="mcg-btn ghost">All contests</Link>}
        />
        {contests.length === 0 ? (
          <EmptyState title="No active contests" description="The next contest window will appear here." />
        ) : (
          <div className="active-contests-grid">
            {contests.map((contest) => {
              const stateMessaging = getContestStateMessaging(contest.status);
              return (
                <Link key={contest.id} href={`/contests/${contest.id}`} className="mcg-surface mcg-contest-card active-contest-card">
                  <div className="mcg-contest-card-top active-contest-card-top">
                    <div className="active-contest-heading">
                      <span className="mcg-eyebrow mcg-contest-code">{contest.code}</span>
                      <strong>{contest.title}</strong>
                      <p className="contest-inline-note active-contest-helper">{stateMessaging.shortLabel}</p>
                    </div>
                    <StatusBadge tone={toTone(contest.status)} label={contest.status} />
                  </div>

                  <div className="active-contest-body">
                    <div className="mcg-contest-meta active-contest-meta">
                      <span>{contest._count.entries.toLocaleString()} entries</span>
                      <span>{contest.lockAt ? `Locks ${new Date(contest.lockAt).toLocaleDateString()}` : "No lock"}</span>
                    </div>

                    <div className="active-contest-chip-row">
                      {contest.seasonName ? <span className="mcg-chip">Season {contest.seasonName}</span> : null}
                      {contest.rewardPreview?.label ? <span className="mcg-chip">{contest.rewardPreview.label}</span> : null}
                      <span className="mcg-chip">{contest.userEntry ? `Entry ${contest.userEntry.status}` : "No entry yet"}</span>
                    </div>

                    <p className="contest-inline-note active-contest-note">{stateMessaging.helper}</p>
                  </div>

                  <div className="active-contest-footer">
                    <span className="active-contest-entry">
                      {contest.userEntry ? `Your entry: ${contest.userEntry.status}` : "No entry yet"}
                    </span>
                    <span className="active-contest-cta">{getPrimaryCtaLabel(contest.status)} →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Surface>
  );
}
