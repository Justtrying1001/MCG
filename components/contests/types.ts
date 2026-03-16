import type { MvpCardView } from "@/types/cards";

export type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
export type ContestEntryStatus = "DRAFT" | "SUBMITTED" | "SCORED" | "SETTLED";

export type ContestRule = {
  id: string;
  cardSetId: string | null;
  maxRosterSize: number | null;
  entryFeeEnabled?: boolean;
  entryFeeAmount?: number | null;
};

export type ContestListItem = {
  id: string;
  code: string;
  title: string;
  status: ContestStatus;
  liveAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  rules: ContestRule[];
  _count: { entries: number };
  rewardPreview?: {
    label: string;
    amount: number | null;
  } | null;
  seasonName?: string | null;
  leagueTierRequired?: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" | "LEGEND" | null;
  userEntry?: {
    id: string;
    status: ContestEntryStatus;
  } | null;
};

export type LineupOption = {
  instanceId: string;
  cardTemplateId: string;
  isLockedByActiveContest: boolean;
  cardSetId: string;
  cardSetCode: string;
  cardSetName: string;
  rarityCode: string;
  editionCode: string;
  name: string;
  imageUrl: string | null;
  tokenProjectName: string;
  tokenProjectId?: string | null;
  cardView?: MvpCardView | null;
};
