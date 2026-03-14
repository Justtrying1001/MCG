import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ContestListItem } from "@/components/contests/types";

function tone(status: ContestListItem["status"]) {
  if (status === "LIVE") return "live" as const;
  if (status === "OPEN") return "open" as const;
  if (status === "LOCKED") return "locked" as const;
  return "settled" as const;
}

export function ContestHistoryCard({ contest }: { contest: ContestListItem }) {
  return (
    <Surface as="article" className="contest-history-card-v2">
      <p className="mcg-eyebrow">{contest.code}</p>
      <strong>{contest.title}</strong>
      <p className="contest-inline-note">{contest._count.entries} entries</p>
      <StatusBadge tone={tone(contest.status)} label={contest.status} />
      <Link href={`/contests/${contest.id}`} className="mcg-btn ghost">Open →</Link>
    </Surface>
  );
}
