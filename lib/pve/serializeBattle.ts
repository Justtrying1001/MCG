import type { BattleResultPayload, PveDifficulty, SimBattleCoreResult } from "@/lib/pve/types";

type SerializeInput = {
  simulation: SimBattleCoreResult;
  difficulty: PveDifficulty;
  rewardPoints: number;
  bonusPackAwarded: boolean;
  remainingBattleTickets: number;
  exhaustedCardIds: string[];
  rewardSummary: string[];
};

export function serializeBattle(input: SerializeInput): BattleResultPayload {
  return {
    ...input.simulation,
    difficulty: input.difficulty,
    rewardPoints: input.rewardPoints,
    bonusPackAwarded: input.bonusPackAwarded,
    remainingBattleTickets: input.remainingBattleTickets,
    exhaustedCardIds: input.exhaustedCardIds,
    rewardSummary: input.rewardSummary,
  };
}
