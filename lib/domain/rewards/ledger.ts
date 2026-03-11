import {
  Prisma,
  RewardLedgerEntryType,
  RewardLedgerReasonType,
} from "@prisma/client";

export type CreditPointsWithLedgerInput = {
  userId: string;
  amount: number;
  reasonType: RewardLedgerReasonType;
  reasonRef?: string;
  idempotencyKey?: string;
  metadata?: Prisma.InputJsonValue;
};

export type DebitPointsWithLedgerInput = {
  userId: string;
  amount: number;
  reasonType: RewardLedgerReasonType;
  reasonRef?: string;
  idempotencyKey?: string;
  metadata?: Prisma.InputJsonValue;
};

function ensurePositiveAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer");
  }
}

export async function creditPointsWithLedger(
  tx: Prisma.TransactionClient,
  params: CreditPointsWithLedgerInput
) {
  ensurePositiveAmount(params.amount);

  if (params.idempotencyKey) {
    const existing = await tx.rewardLedgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      return { entry: existing, applied: false };
    }
  }

  await tx.user.update({
    where: { id: params.userId },
    data: { points: { increment: params.amount } },
  });

  const entry = await tx.rewardLedgerEntry.create({
    data: {
      userId: params.userId,
      entryType: RewardLedgerEntryType.CREDIT,
      amount: params.amount,
      reasonType: params.reasonType,
      reasonRef: params.reasonRef,
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata,
    },
  });

  return { entry, applied: true };
}

export async function debitPointsWithLedger(
  tx: Prisma.TransactionClient,
  params: DebitPointsWithLedgerInput
) {
  ensurePositiveAmount(params.amount);

  if (params.idempotencyKey) {
    const existing = await tx.rewardLedgerEntry.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      return { entry: existing, applied: false };
    }
  }

  const debit = await tx.user.updateMany({
    where: {
      id: params.userId,
      points: { gte: params.amount },
    },
    data: {
      points: { decrement: params.amount },
    },
  });

  if (debit.count !== 1) {
    throw new Error("Not enough points");
  }

  const entry = await tx.rewardLedgerEntry.create({
    data: {
      userId: params.userId,
      entryType: RewardLedgerEntryType.DEBIT,
      amount: params.amount,
      reasonType: params.reasonType,
      reasonRef: params.reasonRef,
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata,
    },
  });

  return { entry, applied: true };
}
