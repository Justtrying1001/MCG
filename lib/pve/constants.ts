import type { PveDifficulty } from "@/lib/pve/types";

export const PVE_TEAM_SIZE = 5;
export const PVE_ROUNDS = 6;
export const PVE_DAILY_TICKETS = 3;

export const REWARD_TABLE: Record<PveDifficulty, { win: number; loss: number; bonusChance: number }> = {
  easy: { win: 90, loss: 20, bonusChance: 0.04 },
  normal: { win: 130, loss: 30, bonusChance: 0.07 },
  hard: { win: 190, loss: 45, bonusChance: 0.11 },
};

export const ENEMY_IMPACT_MULTIPLIER: Record<PveDifficulty, number> = {
  easy: 0.94,
  normal: 1,
  hard: 1.08,
};
