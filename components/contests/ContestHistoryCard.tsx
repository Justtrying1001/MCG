import Link from "next/link";
import type { ContestListItem } from "@/components/contests/types";

export function ContestHistoryCard({ contest }: { contest: ContestListItem }) {
  return (
    <Link href={`/contests/${contest.id}`} className="contest-history-card">
      <p className="contest-code">{contest.code}</p>
      <p className="contest-inline-note">{contest.title}</p>
      <p className="contest-inline-note">{contest.status} · {contest._count.entries} entries</p>
    </Link>
  );
}
