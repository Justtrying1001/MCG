import { prisma } from "@/lib/prisma";
import { getCardsMap } from "@/lib/cards";
import { generateEnemyTeam } from "@/lib/pve/generateEnemyTeam";
import { simulateBattle } from "@/lib/pve/simulateBattle";
import { computeRewards } from "@/lib/pve/rewards";
import { serializeBattle } from "@/lib/pve/serializeBattle";
import { assertTicketsAvailable, validateTeamIds } from "@/lib/pve/availability";
import { ensurePveDailyState } from "@/lib/pve/reset";
import type { PveDifficulty, TeamCard } from "@/lib/pve/types";

export async function executePveBattle(userId: string, selectedCardIds: string[], difficulty: PveDifficulty) {
  const teamError = validateTeamIds(selectedCardIds);
  if (teamError) return { error: teamError, status: 400 as const };

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, pveBattleTickets: true, lastPveResetAt: true } });
    if (!user) return { error: "Unauthorized", status: 401 as const };

    await ensurePveDailyState(tx, user, now);

    const freshUser = await tx.user.findUnique({ where: { id: userId }, select: { pveBattleTickets: true } });
    const ticketError = assertTicketsAvailable(freshUser?.pveBattleTickets ?? 0);
    if (ticketError) return { error: ticketError, status: 400 as const };

    const ownedCards = await tx.userCard.findMany({
      where: { userId, baseCardId: { in: selectedCardIds }, quantity: { gt: 0 } },
      select: { baseCardId: true, pveExhausted: true },
    });

    if (ownedCards.length !== selectedCardIds.length) {
      return { error: "You can only select cards you own", status: 400 as const };
    }

    const exhaustedSelected = ownedCards.filter((c) => c.pveExhausted).map((c) => c.baseCardId);
    if (exhaustedSelected.length > 0) {
      return { error: "Some selected cards are exhausted for PvE today", status: 400 as const };
    }

    const cardsMap = getCardsMap();
    const playerTeam = selectedCardIds
      .map((id) => cardsMap.get(id))
      .filter(Boolean)
      .map((card) => ({
        baseCardId: card!.baseCardId,
        name: card!.name,
        image: card!.image,
        ATK: card!.ATK,
        DEF: card!.DEF,
        SPD: card!.SPD,
        CTRL: card!.CTRL,
      })) as TeamCard[];

    if (playerTeam.length !== selectedCardIds.length) {
      return { error: "Invalid card ids selected", status: 400 as const };
    }

    const enemyTeam = generateEnemyTeam(difficulty);
    const simulation = simulateBattle({ difficulty, playerTeam, enemyTeam });
    const rewards = computeRewards(difficulty, simulation.result === "WIN");

    await tx.user.update({
      where: { id: userId },
      data: {
        points: { increment: rewards.rewardPoints },
        pveBattleTickets: { decrement: 1 },
      },
    });

    await tx.userCard.updateMany({
      where: { userId, baseCardId: { in: selectedCardIds } },
      data: { pveExhausted: true, pveExhaustedAt: now },
    });

    const updatedUser = await tx.user.findUnique({ where: { id: userId }, select: { pveBattleTickets: true } });

    await tx.pveRun.create({
      data: {
        userId,
        difficulty,
        selectedCards: selectedCardIds,
        enemyCards: enemyTeam.map((c) => c.baseCardId),
        result: simulation.result,
        reward: rewards.rewardPoints,
        bonusPackAwarded: rewards.bonusPackAwarded,
        battleMeta: {
          totalRounds: simulation.rounds.length,
          playerRoundsWon: simulation.playerRoundsWon,
          enemyRoundsWon: simulation.enemyRoundsWon,
          playerTotalImpact: simulation.playerTotalImpact,
          enemyTotalImpact: simulation.enemyTotalImpact,
          bestPlayerCardIdsByRound: simulation.rounds.map((r) => r.bestPlayerCardId),
          bestEnemyCardIdsByRound: simulation.rounds.map((r) => r.bestEnemyCardId),
        },
      },
    });

    const payload = serializeBattle({
      simulation,
      difficulty,
      rewardPoints: rewards.rewardPoints,
      bonusPackAwarded: rewards.bonusPackAwarded,
      remainingBattleTickets: updatedUser?.pveBattleTickets ?? 0,
      exhaustedCardIds: selectedCardIds,
      rewardSummary: rewards.rewardSummary,
    });

    return { payload, status: 200 as const };
  });
}
