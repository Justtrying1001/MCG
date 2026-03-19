import { Prisma, PackSource } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const PURCHASE_LIMIT_CONFIG_KEY = "pack_purchase_limit";
const DEFAULT_MAX_PURCHASES_PER_24H = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export type PackPurchaseLimitConfig = {
  enabled: boolean;
  maxPurchasesPer24h: number;
};

export type PackPurchaseLimitStatus = {
  enabled: boolean;
  limit: number | null;
  used: number;
  remainingPurchases: number | null;
  resetAt: string | null;
  cooldownSeconds: number;
  isBlocked: boolean;
  windowHours: number;
};

export class PackPurchaseLimitExceededError extends Error {
  status: number;
  code: string;
  details: PackPurchaseLimitStatus;

  constructor(details: PackPurchaseLimitStatus) {
    super("Daily purchased-pack limit reached");
    this.name = "PackPurchaseLimitExceededError";
    this.status = 429;
    this.code = "PACK_PURCHASE_LIMIT_REACHED";
    this.details = details;
  }
}

function normalizeConfig(value: Prisma.JsonValue | null | undefined): PackPurchaseLimitConfig {
  const root = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const enabled = typeof root.enabled === "boolean" ? root.enabled : true;
  const parsedLimit = Number(root.maxPurchasesPer24h);
  const maxPurchasesPer24h = Number.isInteger(parsedLimit)
    ? Math.max(0, parsedLimit)
    : DEFAULT_MAX_PURCHASES_PER_24H;

  return { enabled, maxPurchasesPer24h };
}

export async function getPackPurchaseLimitConfig(tx: Prisma.TransactionClient | typeof prisma = prisma): Promise<PackPurchaseLimitConfig> {
  const row = await tx.runtimeConfig.findUnique({ where: { key: PURCHASE_LIMIT_CONFIG_KEY } });
  return normalizeConfig(row?.value);
}

export async function updatePackPurchaseLimitConfig(input: PackPurchaseLimitConfig) {
  const normalized: PackPurchaseLimitConfig = {
    enabled: Boolean(input.enabled),
    maxPurchasesPer24h: Math.max(0, Math.trunc(input.maxPurchasesPer24h)),
  };

  const row = await prisma.runtimeConfig.upsert({
    where: { key: PURCHASE_LIMIT_CONFIG_KEY },
    update: { value: normalized as Prisma.InputJsonValue },
    create: { key: PURCHASE_LIMIT_CONFIG_KEY, value: normalized as Prisma.InputJsonValue },
  });

  return normalizeConfig(row.value);
}

export async function getPackPurchaseLimitStatus(params: {
  userId: string;
  now?: Date;
  tx?: Prisma.TransactionClient | typeof prisma;
  config?: PackPurchaseLimitConfig;
}): Promise<PackPurchaseLimitStatus> {
  const tx = params.tx ?? prisma;
  const now = params.now ?? new Date();
  const config = params.config ?? await getPackPurchaseLimitConfig(tx);
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const purchaseEvents = await tx.packOpeningEvent.findMany({
    where: {
      userId: params.userId,
      openedAt: { gte: windowStart },
      packDefinition: { source: PackSource.SALE },
    },
    select: { openedAt: true },
    orderBy: { openedAt: "asc" },
  });

  const used = purchaseEvents.length;
  const limit = config.enabled ? config.maxPurchasesPer24h : null;
  const remainingPurchases = config.enabled ? Math.max(config.maxPurchasesPer24h - used, 0) : null;
  const blockingEvent = config.enabled && used >= config.maxPurchasesPer24h ? purchaseEvents[0] ?? null : null;
  const resetAtDate = blockingEvent ? new Date(blockingEvent.openedAt.getTime() + WINDOW_MS) : null;
  const cooldownSeconds = resetAtDate ? Math.max(Math.ceil((resetAtDate.getTime() - now.getTime()) / 1000), 0) : 0;

  return {
    enabled: config.enabled,
    limit,
    used,
    remainingPurchases,
    resetAt: resetAtDate?.toISOString() ?? null,
    cooldownSeconds,
    isBlocked: Boolean(config.enabled && used >= config.maxPurchasesPer24h),
    windowHours: 24,
  };
}

export async function assertPackPurchaseAllowed(params: {
  userId: string;
  now?: Date;
  tx: Prisma.TransactionClient;
  config?: PackPurchaseLimitConfig;
}) {
  const status = await getPackPurchaseLimitStatus({
    userId: params.userId,
    now: params.now,
    tx: params.tx,
    config: params.config,
  });

  if (status.isBlocked) {
    throw new PackPurchaseLimitExceededError(status);
  }

  return status;
}
