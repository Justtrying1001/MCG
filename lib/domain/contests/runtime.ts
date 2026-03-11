import { prisma } from "@/lib/prisma";
import {
  ContestEntryStatus,
  ContestStatus,
  Prisma,
  RewardType,
} from "@prisma/client";

import { applyContestEntryQuestProgressionTx } from "@/lib/domain/quests/runtime";
import { extractCoinGeckoIdFromTemplateMetadata } from "@/lib/domain/cards/template-metadata";

const DEFAULT_LINEUP_SIZE = 5;
const ACTIVE_LOCK_STATUSES: ContestStatus[] = [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE];

export type ContestLineupValidationResult = {
  contestId: string;
  lineupInstanceIds: string[];
  maxRosterSize: number;
};

export type ScoreSubmission = {
  userId: string;
  score: number;
};

export type RewardGrantInput = {
  userId: string;
  type: RewardType;
  amount?: number;
  packDefinitionId?: string;
};

type CoinGeckoRangePoint = [number, number];

type CoinGeckoRangeResponse = {
  prices?: CoinGeckoRangePoint[];
  market_caps?: CoinGeckoRangePoint[];
  total_volumes?: CoinGeckoRangePoint[];
};

type AutoScoreRow = {
  userId: string;
  score: number;
};

export class ContestRuntimeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ContestRuntimeError";
    this.status = status;
  }
}

function assertFiniteScore(score: number) {
  if (!Number.isFinite(score)) {
    throw new ContestRuntimeError("Score must be a finite number", 400);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function percentile(values: number[], value: number) {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = sorted.findIndex((x) => x >= value);
  if (idx < 0) return 100;
  return clamp((idx / Math.max(sorted.length - 1, 1)) * 100, 0, 100);
}

function getMaxDrawdownFraction(prices: number[]) {
  if (prices.length < 2) return 0;

  let peak = prices[0] ?? 0;
  let maxDrawdown = 0;

  for (const price of prices) {
    if (price > peak) peak = price;
    if (peak <= 0) continue;

    const drawdown = (peak - price) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return clamp(maxDrawdown, 0, 1);
}

async function fetchCoinGeckoRange(params: { coingeckoId: string; fromSec: number; toSec: number; vsCurrency?: string }) {
  const base = process.env.COINGECKO_API_BASE_URL?.trim() || "https://api.coingecko.com/api/v3";
  const vsCurrency = params.vsCurrency ?? "usd";
  const url = `${base}/coins/${encodeURIComponent(params.coingeckoId)}/market_chart/range?vs_currency=${encodeURIComponent(vsCurrency)}&from=${params.fromSec}&to=${params.toSec}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ContestRuntimeError(`CoinGecko request failed for ${params.coingeckoId} (${response.status})`, 502);
  }

  const payload = (await response.json()) as CoinGeckoRangeResponse;
  return payload;
}

function normalizeLineupIds(lineupInstanceIds: unknown): string[] {
  if (!Array.isArray(lineupInstanceIds)) {
    throw new ContestRuntimeError("lineupInstanceIds must be an array of instance IDs", 400);
  }

  const normalized = lineupInstanceIds
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  if (normalized.length === 0) {
    throw new ContestRuntimeError("Lineup cannot be empty", 400);
  }

  const deduped = [...new Set(normalized)];
  if (deduped.length !== normalized.length) {
    throw new ContestRuntimeError("Lineup cannot contain duplicate card instances", 400);
  }

  return deduped;
}

async function getContestRule(tx: Prisma.TransactionClient, contestId: string) {
  return tx.contestRule.findFirst({
    where: { contestId },
    orderBy: { id: "asc" },
  });
}

export async function listContestsMvp() {
  return prismaSafe((tx) =>
    tx.contest.findMany({
      where: { status: { in: [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE, ContestStatus.SETTLED] } },
      include: {
        rules: true,
        _count: { select: { entries: true } },
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      take: 50,
    })
  );
}

export async function getContestDetailMvp(contestId: string, userId?: string) {
  return prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({
      where: { id: contestId },
      include: {
        rules: true,
        _count: { select: { entries: true } },
      },
    });

    if (!contest) {
      throw new ContestRuntimeError("Contest not found", 404);
    }

    const userEntry = userId
      ? await tx.contestEntry.findUnique({
          where: { contestId_userId: { contestId, userId } },
          include: { rosterLocks: true },
        })
      : null;

    return { contest, userEntry };
  });
}

export async function enterContestMvp(params: {
  contestId: string;
  userId: string;
  lineupInstanceIds: unknown;
}) {
  const lineupInstanceIds = normalizeLineupIds(params.lineupInstanceIds);

  return prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { id: params.contestId } });
    if (!contest) {
      throw new ContestRuntimeError("Contest not found", 404);
    }

    if (contest.status !== ContestStatus.OPEN) {
      throw new ContestRuntimeError("Contest is not accepting entries", 400);
    }

    if (contest.lockAt && contest.lockAt <= new Date()) {
      throw new ContestRuntimeError("Contest entry lock time has passed", 400);
    }

    const existingEntry = await tx.contestEntry.findUnique({
      where: { contestId_userId: { contestId: params.contestId, userId: params.userId } },
      select: { id: true },
    });

    if (existingEntry) {
      throw new ContestRuntimeError("User already entered this contest", 409);
    }

    const rule = await getContestRule(tx, params.contestId);
    const maxRosterSize = rule?.maxRosterSize ?? DEFAULT_LINEUP_SIZE;

    if (lineupInstanceIds.length !== maxRosterSize) {
      throw new ContestRuntimeError(`Lineup must contain exactly ${maxRosterSize} cards`, 400);
    }

    const ownedInstances = await tx.ownedCardInstance.findMany({
      where: {
        id: { in: lineupInstanceIds },
        userId: params.userId,
      },
      select: { id: true, cardTemplateId: true },
    });

    if (ownedInstances.length !== lineupInstanceIds.length) {
      throw new ContestRuntimeError(
        "One or more lineup card instances are not owned by the user (ownership truth: OwnedCardInstance)",
        400
      );
    }

    if (rule?.cardSetId) {
      const templateIds = ownedInstances.map((instance) => instance.cardTemplateId);
      const allowedTemplates = await tx.cardTemplate.findMany({
        where: {
          id: { in: templateIds },
          cardSetId: rule.cardSetId,
        },
        select: { id: true },
      });

      if (allowedTemplates.length !== templateIds.length) {
        throw new ContestRuntimeError("One or more lineup card instances violate contest card set eligibility", 400);
      }
    }

    const activeLocks = await tx.rosterLock.findMany({
      where: {
        ownedCardInstanceId: { in: lineupInstanceIds },
        contestEntry: {
          contest: { status: { in: ACTIVE_LOCK_STATUSES } },
          status: { in: [ContestEntryStatus.SUBMITTED, ContestEntryStatus.LOCKED, ContestEntryStatus.SCORED] },
        },
      },
      select: {
        ownedCardInstanceId: true,
        contestEntry: { select: { contestId: true } },
      },
    });

    if (activeLocks.length > 0) {
      throw new ContestRuntimeError(
        "One or more card instances are already locked in an active contest",
        409
      );
    }

    const entry = await tx.contestEntry.create({
      data: {
        contestId: params.contestId,
        userId: params.userId,
        status: ContestEntryStatus.LOCKED,
        rosterLocks: {
          createMany: {
            data: lineupInstanceIds.map((ownedCardInstanceId) => ({ ownedCardInstanceId })),
          },
        },
      },
      include: { rosterLocks: true },
    });

    await tx.ownedCardInstance.updateMany({
      where: { id: { in: lineupInstanceIds }, userId: params.userId },
      data: { lockState: `CONTEST:${params.contestId}:ENTRY:${entry.id}` },
    });

    await applyContestEntryQuestProgressionTx(tx, params.userId);

    return { contestId: params.contestId, entry };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recordContestScoresMvp(params: { contestId: string; scores: ScoreSubmission[] }) {
  if (!Array.isArray(params.scores) || params.scores.length === 0) {
    throw new ContestRuntimeError("scores must be a non-empty array", 400);
  }

  const deduped = new Map<string, number>();
  for (const row of params.scores) {
    if (!row || typeof row.userId !== "string" || row.userId.trim().length === 0) {
      throw new ContestRuntimeError("Each score row must include userId", 400);
    }
    if (typeof row.score !== "number") {
      throw new ContestRuntimeError("Each score row must include numeric score", 400);
    }

    assertFiniteScore(row.score);
    deduped.set(row.userId.trim(), row.score);
  }

  return prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { id: params.contestId } });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);

    if (contest.status !== ContestStatus.LIVE && contest.status !== ContestStatus.LOCKED) {
      throw new ContestRuntimeError("Contest must be LOCKED or LIVE to record scores", 400);
    }

    const rows = [...deduped.entries()].map(([userId, score]) => ({ userId, score }));

    for (const row of rows) {
      await tx.contestScore.upsert({
        where: { contestId_userId: { contestId: params.contestId, userId: row.userId } },
        create: { contestId: params.contestId, userId: row.userId, score: row.score },
        update: { score: row.score, scoredAt: new Date() },
      });
    }

    const scoredRows = await tx.contestScore.findMany({
      where: { contestId: params.contestId },
      orderBy: [{ score: "desc" }, { userId: "asc" }],
      select: { userId: true, score: true },
    });

    await tx.contestRanking.deleteMany({ where: { contestId: params.contestId } });

    if (scoredRows.length > 0) {
      await tx.contestRanking.createMany({
        data: scoredRows.map((row, index) => ({
          contestId: params.contestId,
          userId: row.userId,
          rank: index + 1,
          score: row.score,
        })),
      });
    }

    await tx.contestEntry.updateMany({
      where: { contestId: params.contestId, userId: { in: rows.map((row) => row.userId) } },
      data: { status: ContestEntryStatus.SCORED },
    });

    return { contestId: params.contestId, rankingsCount: scoredRows.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function autoScoreContestWithCoinGeckoMvp(params: { contestId: string; force?: boolean }) {
  const now = new Date();

  const contestPayload = await prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({
      where: { id: params.contestId },
      include: {
        entries: {
          include: {
            rosterLocks: {
              include: {
                ownedCardInstance: {
                  include: {
                    cardTemplate: {
                      select: { id: true, metadata: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contest) {
      throw new ContestRuntimeError("Contest not found", 404);
    }

    if (contest.status !== ContestStatus.LOCKED && contest.status !== ContestStatus.LIVE) {
      throw new ContestRuntimeError("Contest must be LOCKED or LIVE for automatic scoring", 400);
    }

    if (!contest.lockAt || !contest.endsAt) {
      throw new ContestRuntimeError("Contest must define lockAt and endsAt for automatic scoring", 400);
    }

    if (contest.endsAt <= contest.lockAt) {
      throw new ContestRuntimeError("Contest endsAt must be after lockAt", 400);
    }

    if (!params.force && now < contest.endsAt) {
      throw new ContestRuntimeError("Contest has not ended yet. Use force=true to override.", 400);
    }

    return contest;
  });

  const tokenByTemplateId = new Map<string, string>();

  for (const entry of contestPayload.entries) {
    for (const lock of entry.rosterLocks) {
      const template = lock.ownedCardInstance.cardTemplate;
      if (!tokenByTemplateId.has(template.id)) {
        const coingeckoId = extractCoinGeckoIdFromTemplateMetadata(template.metadata as Prisma.JsonValue | null);
        if (!coingeckoId) {
          throw new ContestRuntimeError(
            `Missing CoinGecko ID on template ${template.id} (${template.name})`,
            422
          );
        }

        tokenByTemplateId.set(template.id, coingeckoId);
      }
    }
  }

  const uniqueCoinGeckoIds = [...new Set(tokenByTemplateId.values())];

  const marketByCoinId = new Map<
    string,
    { movementPct: number; avgVolume: number; avgMarketCap: number; maxDrawdownPct: number; score: number }
  >();

  const fromSec = Math.floor((contestPayload.lockAt?.getTime() ?? 0) / 1000);
  const toSec = Math.floor((contestPayload.endsAt?.getTime() ?? 0) / 1000);

  const rawRows: Array<{ id: string; movementPct: number; avgVolume: number; avgMarketCap: number; maxDrawdownPct: number }> = [];

  for (const coinId of uniqueCoinGeckoIds) {
    const payload = await fetchCoinGeckoRange({ coingeckoId: coinId, fromSec, toSec });
    const prices = (payload.prices ?? []).map((row) => row[1]).filter((value) => Number.isFinite(value));
    const volumes = (payload.total_volumes ?? []).map((row) => row[1]).filter((value) => Number.isFinite(value));
    const marketCaps = (payload.market_caps ?? []).map((row) => row[1]).filter((value) => Number.isFinite(value));

    if (prices.length < 2) {
      throw new ContestRuntimeError(`Not enough price points from CoinGecko for ${coinId}`, 502);
    }

    const firstPrice = prices[0] as number;
    const lastPrice = prices[prices.length - 1] as number;

    const movementPct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
    const avgVolume = average(volumes);
    const avgMarketCap = average(marketCaps);
    const maxDrawdownPct = getMaxDrawdownFraction(prices) * 100;

    rawRows.push({ id: coinId, movementPct, avgVolume, avgMarketCap, maxDrawdownPct });
  }

  const movementValues = rawRows.map((row) => row.movementPct);
  const volumeValues = rawRows.map((row) => row.avgVolume);
  const marketCapValues = rawRows.map((row) => row.avgMarketCap);

  for (const row of rawRows) {
    const movementScore = clamp(50 + row.movementPct * 2, 0, 100);
    const volumeScore = percentile(volumeValues, row.avgVolume);
    const marketCapScore = percentile(marketCapValues, row.avgMarketCap);
    const stabilityScore = clamp(100 - row.maxDrawdownPct, 0, 100);

    const finalCardScore =
      movementScore * 0.5 +
      volumeScore * 0.2 +
      marketCapScore * 0.2 +
      stabilityScore * 0.1;

    marketByCoinId.set(row.id, {
      movementPct: row.movementPct,
      avgVolume: row.avgVolume,
      avgMarketCap: row.avgMarketCap,
      maxDrawdownPct: row.maxDrawdownPct,
      score: Number(finalCardScore.toFixed(4)),
    });
  }

  const entryScores: AutoScoreRow[] = [];

  for (const entry of contestPayload.entries) {
    let total = 0;
    for (const lock of entry.rosterLocks) {
      const templateId = lock.ownedCardInstance.cardTemplate.id;
      const coinId = tokenByTemplateId.get(templateId);
      if (!coinId) {
        throw new ContestRuntimeError(`Missing CoinGecko ID mapping for template ${templateId}`, 500);
      }

      const metrics = marketByCoinId.get(coinId);
      if (!metrics) {
        throw new ContestRuntimeError(`Missing market metrics for ${coinId}`, 500);
      }

      total += metrics.score;
    }

    entryScores.push({ userId: entry.userId, score: Number(total.toFixed(4)) });
  }

  const scored = await recordContestScoresMvp({ contestId: params.contestId, scores: entryScores });

  return {
    ...scored,
    scoringWindow: {
      from: contestPayload.lockAt?.toISOString() ?? null,
      to: contestPayload.endsAt?.toISOString() ?? null,
    },
    tokensScored: uniqueCoinGeckoIds.length,
    entriesScored: entryScores.length,
    formula: {
      movementWeight: 0.5,
      volumeWeight: 0.2,
      marketCapWeight: 0.2,
      stabilityWeight: 0.1,
      movementTransform: "score = clamp(50 + movementPct*2, 0, 100)",
      stabilitySignal: "max drawdown over contest window",
    },
  };
}

export async function settleContestMvp(params: { contestId: string; rewards: RewardGrantInput[] }) {
  return prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { id: params.contestId } });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);

    if (contest.status === ContestStatus.SETTLED) {
      throw new ContestRuntimeError("Contest already settled", 409);
    }

    if (!Array.isArray(params.rewards)) {
      throw new ContestRuntimeError("rewards must be an array", 400);
    }

    const existingSettlement = await tx.contestSettlement.findUnique({
      where: { contestId: params.contestId },
      select: { id: true },
    });

    if (existingSettlement) {
      throw new ContestRuntimeError("Contest settlement already exists", 409);
    }

    const settlement = await tx.contestSettlement.create({
      data: { contestId: params.contestId },
    });

    for (const reward of params.rewards) {
      if (reward.type === RewardType.POINTS && typeof reward.amount !== "number") {
        throw new ContestRuntimeError("POINTS rewards require amount", 400);
      }

      await tx.rewardGrant.create({
        data: {
          userId: reward.userId,
          type: reward.type,
          amount: reward.amount,
          packDefinitionId: reward.packDefinitionId,
          sourceContestSettlementId: settlement.id,
        },
      });

      if (reward.type === RewardType.POINTS && reward.amount) {
        await tx.user.update({
          where: { id: reward.userId },
          data: { points: { increment: reward.amount } },
        });
      }
    }

    await tx.contest.update({
      where: { id: params.contestId },
      data: { status: ContestStatus.SETTLED },
    });

    await tx.contestEntry.updateMany({
      where: { contestId: params.contestId },
      data: { status: ContestEntryStatus.SETTLED },
    });

    return { contestId: params.contestId, settlementId: settlement.id, rewardCount: params.rewards.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createContestMvp(input: {
  code: string;
  title: string;
  startsAt?: string | null;
  lockAt?: string | null;
  endsAt?: string | null;
  status?: ContestStatus;
  maxRosterSize?: number;
  cardSetId?: string | null;
  config?: Prisma.InputJsonValue;
}) {
  const code = input.code.trim();
  const title = input.title.trim();

  if (!code || !title) {
    throw new ContestRuntimeError("code and title are required", 400);
  }

  const status = input.status ?? ContestStatus.DRAFT;

  return prismaSafe((tx) =>
    tx.contest.create({
      data: {
        code,
        title,
        status,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        lockAt: input.lockAt ? new Date(input.lockAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        rules: {
          create: {
            maxRosterSize: input.maxRosterSize ?? DEFAULT_LINEUP_SIZE,
            cardSetId: input.cardSetId ?? null,
            config: input.config,
          },
        },
      },
      include: { rules: true },
    })
  );
}

export async function updateContestStatusMvp(contestId: string, status: ContestStatus) {
  return prismaSafe((tx) =>
    tx.contest.update({
      where: { id: contestId },
      data: { status },
    })
  );
}

export async function getContestRankingMvp(contestId: string) {
  return prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({
      where: { id: contestId },
      select: { id: true, status: true, title: true },
    });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);

    const rankings = await tx.contestRanking.findMany({
      where: { contestId },
      orderBy: [{ rank: "asc" }],
    });

    return { contest, rankings };
  });
}

async function prismaSafe<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel }) {
  return prisma.$transaction(fn, options);
}
