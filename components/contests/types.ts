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
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  rules: ContestRule[];
  _count: { entries: number };
};

export type LineupOption = {
  instanceId: string;
  cardTemplateId: string;
  lockState: string | null;
  cardSetId: string;
  cardSetCode: string;
  cardSetName: string;
  rarityCode: string;
  editionCode: string;
  name: string;
  imageUrl: string | null;
  tokenProjectName: string;
};
