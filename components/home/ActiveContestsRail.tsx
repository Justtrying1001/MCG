import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

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
          eyebrow="Compete"
          title="Active contests"
          subtitle="Jump into live windows and review where you already have an entry."
          actions={<Link href="/contests" className="mcg-btn ghost">All contests</Link>}
        />
        {contests.length === 0 ? (
          <EmptyState title="No active contests" description="The next contest window will appear here." />
        ) : (
          <div className="active-contests-grid">
            {contests.map((contest) => (
              <Link key={contest.id} href={`/contests/${contest.id}`} className="mcg-surface mcg-contest-card active-contest-card">
                <div className="mcg-contest-card-top active-contest-card-top">
                  <div className="active-contest-heading">
                    <span className="mcg-eyebrow mcg-contest-code">{contest.code}</span>
                    <strong>{contest.title}</strong>
                  </div>
                  <StatusBadge tone={toTone(contest.status)} label={contest.status} />
                </div>

                <div className="active-contest-body">
                  <div className="mcg-contest-meta active-contest-meta">
                    <span>{contest._count.entries.toLocaleString()} entries</span>
                    <span>{contest.lockAt ? `Locks ${new Date(contest.lockAt).toLocaleDateString()}` : "No lock"}</span>
                  </div>

                  {contest.seasonName ? (
                    <p className="active-contest-season">Season: {contest.seasonName}</p>
                  ) : null}

                  {contest.rewardPreview?.label ? (
                    <p className="active-contest-reward">{contest.rewardPreview.label}</p>
                  ) : null}
                </div>

                <div className="active-contest-footer">
                  <span className="active-contest-entry">
                    {contest.userEntry ? `Your entry: ${contest.userEntry.status}` : "No entry yet"}
                  </span>
                  <span className="active-contest-cta">View contest →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Surface>
  );
}
