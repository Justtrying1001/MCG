import type { ContestListItem } from "@/components/contests/types";
import { ContestTile } from "@/components/contests/ContestTile";

export function ContestCard({ contest, nowTs }: { contest: ContestListItem; nowTs: number }) {
  return <ContestTile contest={contest} nowTs={nowTs} />;
}
