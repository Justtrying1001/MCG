import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getCardsMap } from "@/lib/cards";
import { PVE_TEAM_SIZE } from "@/lib/pve/constants";
import { generateEnemyTeam } from "@/lib/pve/generateEnemyTeam";
import { computeRewards } from "@/lib/pve/rewards";
import { serializeBattleResult } from "@/lib/pve/serializeBattle";
import { simulateBattle } from "@/lib/pve/simulateBattle";
import type { TeamCard } from "@/lib/pve/types";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  selectedCardIds: z.array(z.string()).length(PVE_TEAM_SIZE),
  difficulty: z.enum(["easy", "normal", "hard"]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse(`Invalid PvE payload: exactly ${PVE_TEAM_SIZE} cards are required`, { status: 400 });
  }

  const uniqueIds = [...new Set(parsed.data.selectedCardIds)];
  if (uniqueIds.length !== PVE_TEAM_SIZE) {
    return new NextResponse("PvE team cannot include duplicates", { status: 400 });
  }

  const owned = await prisma.userCard.findMany({
    where: { userId: user.id, baseCardId: { in: uniqueIds }, quantity: { gt: 0 } },
  });

  if (owned.length !== uniqueIds.length) {
    return new NextResponse("You can only use owned cards", { status: 400 });
  }

  const cardsMap = getCardsMap();
  const playerTeam = uniqueIds.map((id) => cardsMap.get(id)).filter(Boolean);
  if (playerTeam.length !== PVE_TEAM_SIZE) {
    return new NextResponse("Invalid card ids in selected team", { status: 400 });
  }

  const playerBattleTeam: TeamCard[] = playerTeam.map((card) => ({
    baseCardId: card!.baseCardId,
    name: card!.name,
    image: card!.image,
    ATK: card!.ATK,
    DEF: card!.DEF,
    SPD: card!.SPD,
    CTRL: card!.CTRL,
  }));

  const enemyTeam = generateEnemyTeam(parsed.data.difficulty);
  const simulation = simulateBattle({
    difficulty: parsed.data.difficulty,
    playerTeam: playerBattleTeam,
    enemyTeam,
  });

  const rewards = computeRewards(parsed.data.difficulty, simulation.result === "WIN");

  const payload = serializeBattleResult({
    difficulty: parsed.data.difficulty,
    simulation,
    rewardPoints: rewards.rewardPoints,
    bonusPackAwarded: rewards.bonusPackAwarded,
    rewardSummary: rewards.rewardSummary,
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { points: { increment: payload.rewardPoints } } });
    await tx.pveRun.create({
      data: {
        userId: user.id,
        difficulty: parsed.data.difficulty,
        selectedCards: uniqueIds,
        enemyCards: enemyTeam.map((c) => c.baseCardId),
        result: payload.result,
        reward: payload.rewardPoints,
        battleMeta: {
          totalRounds: payload.totalRounds,
          survivingPlayerUnits: payload.battleStats.survivingPlayerUnits,
          survivingEnemyUnits: payload.battleStats.survivingEnemyUnits,
          damageDone: payload.battleStats.damageDone,
          damageTaken: payload.battleStats.damageTaken,
          bonusPackAwarded: payload.bonusPackAwarded,
          playerHpRemaining: payload.battleStats.playerHpRemaining,
          enemyHpRemaining: payload.battleStats.enemyHpRemaining,
        },
      },
    });
  });

  return NextResponse.json(payload);
}
