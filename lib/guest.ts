import type { BaseCard } from "@/types/cards";
import type { BattleResultPayload, PveDifficulty } from "@/lib/pve/types";

export type GuestCollectionItem = {
  baseCardId: string;
  quantity: number;
  pveExhausted: boolean;
  card: BaseCard;
};

export type GuestState = {
  points: number;
  packsOpened: number;
  pveBattleTickets: number;
  lastPveResetAt: string;
  collection: GuestCollectionItem[];
  openingsCount: number;
  pveRunsCount: number;
  nextPveResetAt: string;
};

export type GuestBattleRequest = {
  state: GuestState;
  selectedCardIds: string[];
  difficulty: PveDifficulty;
};

export type GuestBattleResponse = {
  battle: BattleResultPayload;
  state: GuestState;
};
