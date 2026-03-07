import type { BaseCard } from "@/types/cards";

export type PveDifficulty = "easy" | "normal" | "hard";

export type BattleSide = "player" | "enemy";

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
  maxHp: number;
};

export type BattleActionLog = {
  round: number;
  actorSide: BattleSide;
  actorSlot: number;
  targetSide: BattleSide;
  targetSlot: number;
  damage: number;
  isCrit: boolean;
  targetRemainingHp: number;
  targetDefeated: boolean;
};

export type BattleResult = "WIN" | "LOSS";

export type BattleResultPayload = {
  result: BattleResult;
  difficulty: PveDifficulty;
  playerTeam: BattleUnitSnapshot[];
  enemyTeam: BattleUnitSnapshot[];
  rounds: BattleActionLog[];
  totalRounds: number;
  rewardPoints: number;
  bonusPackAwarded: boolean;
  rewardSummary: string[];
  battleStats: {
    survivingPlayerUnits: number;
    survivingEnemyUnits: number;
    playerHpRemaining: number;
    enemyHpRemaining: number;
    damageDone: number;
    damageTaken: number;
  };
};

export type SimUnit = {
  side: BattleSide;
  slot: number;
  baseCardId: string;
  name: string;
  image: string;
  atk: number;
  def: number;
  spd: number;
  ctrl: number;
  maxHp: number;
  hp: number;
};

export type PveRewards = {
  rewardPoints: number;
  bonusPackAwarded: boolean;
  rewardSummary: string[];
};

export type TeamCard = Pick<BaseCard, "baseCardId" | "name" | "image" | "ATK" | "DEF" | "SPD" | "CTRL">;
