import type { PveDifficulty } from "@/lib/pve/types";

export const PVE_TEAM_SIZE = 5;
export const MAX_BATTLE_ROUNDS = 20;

export const REWARD_TABLE: Record<PveDifficulty, { win: number; loss: number; bonusChance: number }> = {
  easy: { win: 90, loss: 25, bonusChance: 0.04 },
  normal: { win: 130, loss: 35, bonusChance: 0.07 },
  hard: { win: 190, loss: 50, bonusChance: 0.11 },
};

export const DIFFICULTY_MODIFIERS: Record<PveDifficulty, { hpMult: number; damageMult: number }> = {
  easy: { hpMult: 0.92, damageMult: 0.92 },
  normal: { hpMult: 1, damageMult: 1 },
  hard: { hpMult: 1.1, damageMult: 1.08 },
};
