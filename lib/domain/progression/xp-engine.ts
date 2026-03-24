import type { Prisma, PrismaClient } from "@prisma/client";

export const XP_REWARDS = {
  QUEST_COMPLETED: 50,
  MILESTONE_COMPLETED: 150,
  PACK_OPENED: 20,
  BATTLE_ENTERED: 40,
  BATTLE_SETTLED: 60,
  BATTLE_WON: 150,
  BATTLE_PODIUM: 100,
} as const;

export type XpAction = keyof typeof XP_REWARDS;

export function xpRequiredForLevel(level: number): number {
  const n = Math.max(1, level) - 1;
  return 30 * n * n + 70 * n;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) {
    level += 1;
  }
  return level;
}

export async function grantXp(
  tx: PrismaClient | Prisma.TransactionClient,
  userId: string,
  action: XpAction,
): Promise<{ xp: number; level: number; xpGained: number }> {
  const gained = XP_REWARDS[action];

  const progression = await tx.userProgression.upsert({
    where: { userId },
    create: { userId, xp: gained, level: levelFromXp(gained) },
    update: {
      xp: { increment: gained },
    },
    select: { xp: true },
  });

  const newLevel = levelFromXp(progression.xp);

  await tx.userProgression.update({
    where: { userId },
    data: { level: newLevel },
  });

  return { xp: progression.xp, level: newLevel, xpGained: gained };
}
