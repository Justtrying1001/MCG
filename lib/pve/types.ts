import type { BaseCard } from "@/types/cards";

export type PveDifficulty = "easy" | "normal" | "hard";
export type BattleSide = "player" | "enemy";
export type RoundWinner = "player" | "enemy" | "draw";

export type TeamCard = Pick<BaseCard, "baseCardId" | "name" | "image" | "ATK" | "DEF" | "SPD" | "CTRL">;

export type BattleUnitSnapshot = {
  side: BattleSide;
  slot: number;
  baseCardId: string;
  name: string;
  image: string;
  atk: number;
  def: number;
  spd: number;
  ctrl: number;
};

export type BattleActionLog = {
  round: number;
  actorSide: BattleSide;
  actorSlot: number;
  actorCardId: string;
  targetSide: BattleSide;
  targetSlot: number;
  targetCardId: string;
  impact: number;
  isCrit: boolean;
};

export type RoundSummary = {
  round: number;
  playerImpact: number;
  enemyImpact: number;
  winner: RoundWinner;
  bestPlayerCardId: string | null;
  bestEnemyCardId: string | null;
};

export type BattleResultPayload = {
  result: "WIN" | "LOSS";
  difficulty: PveDifficulty;
  playerTeam: BattleUnitSnapshot[];
  enemyTeam: BattleUnitSnapshot[];
  actions: BattleActionLog[];
  rounds: RoundSummary[];
  playerRoundsWon: number;
  enemyRoundsWon: number;
  playerTotalImpact: number;
  enemyTotalImpact: number;
  rewardPoints: number;
  bonusPackAwarded: boolean;
  remainingBattleTickets: number;
  exhaustedCardIds: string[];
  rewardSummary: string[];
};

export type SimUnit = BattleUnitSnapshot;

export type SimBattleCoreResult = Omit<
  BattleResultPayload,
  "difficulty" | "rewardPoints" | "bonusPackAwarded" | "remainingBattleTickets" | "exhaustedCardIds" | "rewardSummary"
>;
