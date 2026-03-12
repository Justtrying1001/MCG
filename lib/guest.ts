import type { MvpCardView } from "@/types/cards";

export type GuestCollectionItem = {
  templateId: string;
  instanceCount: number;
  card: MvpCardView;
};

export type GuestState = {
  points: number;
  packsOpened: number;
  mvpCollection: GuestCollectionItem[];
  openingsCount: number;
};
