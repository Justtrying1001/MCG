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
    <Surface>
      <div className="mcg-home-section">
        <SectionHeader
          eyebrow="Compete"
          title="Active Contests"
          subtitle="Build your lineup and enter before lock."
          actions={<Link href="/contests" className="mcg-btn ghost">All contests</Link>}
        />
        {contests.length === 0 ? (
          <EmptyState title="No active contests" description="Next competition window will appear here." />
        ) : (
          <div className="mcg-rail">
            {contests.map((contest) => (
              <Link key={contest.id} href={`/contests/${contest.id}`} className="mcg-surface mcg-contest-card">
                <div className="mcg-contest-card-top">
                  <strong>{contest.title}</strong>
                  <StatusBadge tone={toTone(contest.status)} label={contest.status} />
                </div>
                <div className="mcg-contest-meta">
                  <span>{contest._count.entries} entries</span>
                  <span>{contest.lockAt ? `Locks ${new Date(contest.lockAt).toLocaleDateString()}` : "No lock"}</span>
                </div>
                <span className="mcg-eyebrow mcg-contest-code">{contest.code}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Surface>
  );
}
