import { getContestStatusMeta } from "@/components/contests/contestUtils";
import type { ContestStatus } from "@/components/contests/types";

export function ContestStatusBadge({ status }: { status: ContestStatus }) {
  const meta = getContestStatusMeta(status);
  return <span className={`contest-status status-${status.toLowerCase()}`}>{meta.icon} {meta.label}</span>;
}
