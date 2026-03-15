export type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

export type ContestRule = {
  id: string;
  cardSetId: string | null;
  maxRosterSize: number | null;
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
  seasonName?: string | null;
  leagueTierRequired?: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" | "LEGEND" | null;
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
};
