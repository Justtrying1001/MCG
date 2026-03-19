import type { ContestListItem } from "@/components/contests/types";
import { ContestTile } from "@/components/contests/ContestTile";

export function ContestCard({ contest }: { contest: ContestListItem; nowTs?: number }) {
  return <ContestTile contest={contest} />;
}
