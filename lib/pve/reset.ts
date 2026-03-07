import type { Prisma, User } from "@prisma/client";
import { PVE_DAILY_TICKETS } from "@/lib/pve/constants";

function utcDateKey(d: Date) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

export function shouldResetPve(lastResetAt: Date, now = new Date()) {
  return utcDateKey(lastResetAt) !== utcDateKey(now);
}

export async function applyPveDailyReset(tx: Prisma.TransactionClient, userId: string, now = new Date()) {
  await tx.user.update({
    where: { id: userId },
    data: { pveBattleTickets: PVE_DAILY_TICKETS, lastPveResetAt: now },
  });

  await tx.userCard.updateMany({
    where: { userId, pveExhausted: true },
    data: { pveExhausted: false, pveExhaustedAt: null },
  });
}

export async function ensurePveDailyState(tx: Prisma.TransactionClient, user: Pick<User, "id" | "lastPveResetAt">, now = new Date()) {
  if (shouldResetPve(user.lastPveResetAt, now)) {
    await applyPveDailyReset(tx, user.id, now);
    return true;
  }
  return false;
}
