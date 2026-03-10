import type { BaseCard } from "@/types/cards";

export type GuestCollectionItem = {
  baseCardId: string;
  quantity: number;
  card: BaseCard;
};

export type GuestState = {
  points: number;
  packsOpened: number;
  collection: GuestCollectionItem[];
  openingsCount: number;
};
