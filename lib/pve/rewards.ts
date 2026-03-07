import { GAME_CONFIG } from "@/lib/cards";
import { REWARD_TABLE } from "@/lib/pve/constants";
import type { PveDifficulty } from "@/lib/pve/types";

export function computeRewards(difficulty: PveDifficulty, didWin: boolean) {
  const rules = REWARD_TABLE[difficulty];
  let rewardPoints = didWin ? rules.win : rules.loss;
  let bonusPackAwarded = false;

  if (didWin && Math.random() < rules.bonusChance) {
    bonusPackAwarded = true;
    rewardPoints += GAME_CONFIG.PACK_COST;
  }

  return {
    rewardPoints,
    bonusPackAwarded,
    rewardSummary: [
      didWin ? `Win reward: +${rules.win} points` : `Loss reward: +${rules.loss} points`,
      bonusPackAwarded ? `Bonus proc: +${GAME_CONFIG.PACK_COST} points (pack equivalent)` : "Bonus proc: none",
    ],
  };
}
