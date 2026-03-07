import { GAME_CONFIG } from "@/lib/cards";
import { REWARD_TABLE } from "@/lib/pve/constants";
import type { PveDifficulty, PveRewards } from "@/lib/pve/types";

export function computeRewards(difficulty: PveDifficulty, won: boolean): PveRewards {
  const table = REWARD_TABLE[difficulty];
  const rewardPoints = won ? table.win : table.loss;

  let bonusPackAwarded = false;
  let finalPoints = rewardPoints;
  if (won && Math.random() < table.bonusChance) {
    bonusPackAwarded = true;
    finalPoints += GAME_CONFIG.PACK_COST;
  }

  const rewardSummary = [
    won ? `Victory reward: +${table.win} points` : `Defeat reward: +${table.loss} points`,
    bonusPackAwarded
      ? `Rare bonus hit: +${GAME_CONFIG.PACK_COST} points (pack equivalent).`
      : "Rare bonus: not awarded this run.",
  ];

  return { rewardPoints: finalPoints, bonusPackAwarded, rewardSummary };
}
