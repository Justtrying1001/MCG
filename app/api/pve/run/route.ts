import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getBaseCards, getCardsMap, openBasePack, GAME_CONFIG, type PveDifficulty } from "@/lib/cards";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  selectedCardIds: z.array(z.string()).min(1).max(3),
  difficulty: z.enum(["easy", "normal", "hard"]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse("Invalid PvE payload", { status: 400 });
  }

  const uniqueIds = [...new Set(parsed.data.selectedCardIds)];

  const owned = await prisma.userCard.findMany({
    where: { userId: user.id, baseCardId: { in: uniqueIds }, quantity: { gt: 0 } },
  });

  if (owned.length !== uniqueIds.length) {
    return new NextResponse("You can only use owned cards", { status: 400 });
  }

  const cardsMap = getCardsMap();
  const playerCards = uniqueIds.map((id) => cardsMap.get(id)).filter(Boolean);
  const playerPower = playerCards.reduce((s, c) => s + c!.ATK + c!.DEF + c!.SPD + c!.CTRL, 0);

  const enemyCards = openBasePack(getBaseCards()).slice(0, playerCards.length);
  const scale = GAME_CONFIG.PVE_DIFFICULTY[parsed.data.difficulty as PveDifficulty];
  const enemyPower = Math.round(
    enemyCards.reduce((s, c) => s + c.ATK + c.DEF + c.SPD + c.CTRL, 0) * scale.enemyMult,
  );

  const won = playerPower >= enemyPower;
  let reward = won ? scale.reward : Math.round(scale.reward * 0.2);
  let bonusPack = false;

  if (won && Math.random() < 0.15) {
    bonusPack = true;
    reward += GAME_CONFIG.PACK_COST;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { points: { increment: reward } } });
    await tx.pveRun.create({
      data: {
        userId: user.id,
        difficulty: parsed.data.difficulty,
        selectedCards: uniqueIds,
        enemyCards: enemyCards.map((c) => c.baseCardId),
        result: won ? "WIN" : "LOSS",
        reward,
        battleMeta: { playerPower, enemyPower, bonusPack },
      },
    });
  });

  const log = [
    `Battle result: ${won ? "WIN" : "LOSS"}`,
    `Difficulty: ${parsed.data.difficulty}`,
    `Player power: ${playerPower}`,
    `Enemy power: ${enemyPower}`,
    `Reward points: ${reward}`,
    bonusPack ? "Bonus drop: points equivalent to 1 free pack." : "Bonus drop: none",
    "Loop state: open packs -> collect -> PvE -> rewards -> open more packs",
  ].join("\n");

  return NextResponse.json({ log, won, reward });
}
