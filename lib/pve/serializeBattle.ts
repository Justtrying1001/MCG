import type { BattleResultPayload, PveDifficulty } from "@/lib/pve/types";

type SerializeInput = {
  difficulty: PveDifficulty;
  simulation: Omit<BattleResultPayload, "difficulty" | "rewardPoints" | "bonusPackAwarded" | "rewardSummary">;
  rewardPoints: number;
  bonusPackAwarded: boolean;
  rewardSummary: string[];
};

export function serializeBattleResult(input: SerializeInput): BattleResultPayload {
  return {
    result: input.simulation.result,
    difficulty: input.difficulty,
    playerTeam: input.simulation.playerTeam,
    enemyTeam: input.simulation.enemyTeam,
    rounds: input.simulation.rounds,
    totalRounds: input.simulation.totalRounds,
    rewardPoints: input.rewardPoints,
    bonusPackAwarded: input.bonusPackAwarded,
    rewardSummary: input.rewardSummary,
    battleStats: input.simulation.battleStats,
  };
}
