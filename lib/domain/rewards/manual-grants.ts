import { Prisma, RewardLedgerEntryType, RewardLedgerReasonType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { LedgerConventions } from "@/lib/domain/rewards/conventions";
import { creditPointsWithLedger } from "@/lib/domain/rewards/ledger";

export class ManualGrantError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ManualGrantError";
    this.status = status;
  }
}

function normalizeAmount(amount: unknown) {
  const parsed = Number(amount);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ManualGrantError("amount must be a positive integer", 400);
  }

  return parsed;
}

export async function grantManualPointsMvp(input: {
  userId?: unknown;
  amount?: unknown;
  reasonLabel?: unknown;
  reasonCode?: unknown;
  metadata?: unknown;
  idempotencyKey?: unknown;
  grantedByAdmin?: string;
}) {
  const userId = String(input.userId ?? "").trim();
  if (!userId) {
    throw new ManualGrantError("userId is required", 400);
  }

  const amount = normalizeAmount(input.amount);
  const reasonLabel = input.reasonLabel ? String(input.reasonLabel).trim() : "";
  if (!reasonLabel) {
    throw new ManualGrantError("reasonLabel is required", 400);
  }

  const reasonCode = input.reasonCode ? String(input.reasonCode).trim() : null;
  const idempotencyKeyRaw = input.idempotencyKey ? String(input.idempotencyKey).trim() : null;
  const idempotencyKey = idempotencyKeyRaw || `manual-grant:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  const metadata: Prisma.InputJsonValue = {
    reasonLabel,
    reasonCode,
    grantedByAdmin: input.grantedByAdmin ?? "unknown",
    ...(input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? input.metadata as Record<string, unknown>
      : {}),
  };

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, points: true, displayName: true, xUsername: true },
    });

    if (!user) {
      throw new ManualGrantError("User not found", 404);
    }

    const result = await creditPointsWithLedger(tx, {
      userId,
      amount,
      reasonType: RewardLedgerReasonType.ADMIN_GRANT,
      reasonRef: LedgerConventions.adminGrant.reasonRef(idempotencyKey),
      idempotencyKey,
      metadata,
    });

    const refreshedUser = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, points: true, displayName: true, xUsername: true },
    });

    return {
      applied: result.applied,
      entry: result.entry,
      user: refreshedUser,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listRecentManualGrantsMvp(limit = 100) {
  const take = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 300) : 100;

  return prisma.rewardLedgerEntry.findMany({
    where: {
      reasonType: RewardLedgerReasonType.ADMIN_GRANT,
      entryType: RewardLedgerEntryType.CREDIT,
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          xUsername: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take,
  });
}
