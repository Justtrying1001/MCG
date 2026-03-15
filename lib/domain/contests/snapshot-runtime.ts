import { ContestSnapshotPhase, Prisma } from "@prisma/client";

import { fetchCoinsMarkets } from "@/lib/domain/contests/coingecko-client";
import { resolveEligibleTokensForContest } from "@/lib/domain/contests/eligibility-runtime";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { prisma } from "@/lib/prisma";

type SnapshotCaptureResult = {
  contestId: string;
  phase: ContestSnapshotPhase;
  tokenCount: number;
  capturedCount: number;
  missingCount: number;
};

export async function captureStartSnapshot(contestId: string) {
  return captureSnapshot(contestId, ContestSnapshotPhase.START);
}

export async function captureEndSnapshot(contestId: string) {
  return captureSnapshot(contestId, ContestSnapshotPhase.END);
}

async function captureSnapshot(contestId: string, phase: ContestSnapshotPhase): Promise<SnapshotCaptureResult> {
  // Step 1: resolve token list outside the transaction so retries do not hold DB locks
  const tokens = phase === ContestSnapshotPhase.START
    ? await resolveEligibleTokensForContest(contestId)
    : await resolveCanonicalTokensFromStart(contestId);

  if (tokens.length === 0) {
    throw new ContestRuntimeError("No eligible tokens resolved for snapshot", 409);
  }

  const geckoIds = tokens.map((token) => token.coingeckoId).filter((id): id is string => Boolean(id));

  // Step 2: fetch market data with retry (outside transaction; retries may sleep between attempts)
  let markets: Awaited<ReturnType<typeof fetchCoinsMarkets>> = [];
  if (phase === ContestSnapshotPhase.START) {
    // START snapshot is critical for scoring — propagate failure to block LIVE transition
    markets = await fetchMarketsWithRetry(geckoIds, phase, contestId);
  } else {
    try {
      markets = await fetchMarketsWithRetry(geckoIds, phase, contestId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[contest-snapshot] CoinGecko all retries exhausted for END snapshot contest=${contestId}: ${message}. Proceeding with null metrics.`);
      markets = [];
    }
  }

  const marketById = new Map(markets.map((row) => [row.id.toLowerCase(), row]));

  // Pre-compute aggregates stored on every row for diagnostic querying
  const capturedCount = tokens.filter((t) => t.coingeckoId && marketById.has(t.coingeckoId.toLowerCase())).length;
  const missingCount = tokens.length - capturedCount;

  // Step 3: store results in a transaction
  return prisma.$transaction(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { id: contestId }, select: { id: true } });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);

    for (const token of tokens) {
      const market = token.coingeckoId ? marketById.get(token.coingeckoId.toLowerCase()) : null;
      await tx.contestTokenSnapshot.upsert({
        where: {
          contestId_tokenProjectId_phase: {
            contestId,
            tokenProjectId: token.tokenProjectId,
            phase,
          },
        },
        create: {
          contestId,
          tokenProjectId: token.tokenProjectId,
          geckoId: token.coingeckoId ?? token.slug,
          phase,
          priceUsd: toDecimalInput(market?.current_price),
          marketCapUsd: toDecimalInput(market?.market_cap),
          volume24hUsd: toDecimalInput(market?.total_volume),
          marketCapRank: normalizeInt(market?.market_cap_rank),
          marketDataUpdatedAt: normalizeDate(market?.last_updated),
          provider: "COINGECKO",
          capturedCount,
          missingCount,
        },
        update: {
          geckoId: token.coingeckoId ?? token.slug,
          priceUsd: toDecimalInput(market?.current_price),
          marketCapUsd: toDecimalInput(market?.market_cap),
          volume24hUsd: toDecimalInput(market?.total_volume),
          marketCapRank: normalizeInt(market?.market_cap_rank),
          marketDataUpdatedAt: normalizeDate(market?.last_updated),
          capturedAt: new Date(),
          provider: "COINGECKO",
          capturedCount,
          missingCount,
        },
      });
    }

    return {
      contestId,
      phase,
      tokenCount: tokens.length,
      capturedCount,
      missingCount,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function fetchMarketsWithRetry(
  geckoIds: string[],
  phase: ContestSnapshotPhase,
  contestId: string
): Promise<Awaited<ReturnType<typeof fetchCoinsMarkets>>> {
  const delays = [2000, 4000, 8000];
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetchCoinsMarkets(geckoIds);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[contest-snapshot] CoinGecko attempt ${attempt + 1}/3 failed for contest=${contestId} phase=${phase}: ${message}`);
      if (attempt < 2) {
        await new Promise<void>((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  throw lastError;
}

async function resolveCanonicalTokensFromStart(contestId: string, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const startRows = await db.contestTokenSnapshot.findMany({
    where: { contestId, phase: ContestSnapshotPhase.START },
    select: {
      tokenProjectId: true,
      geckoId: true,
      tokenProject: { select: { slug: true, coingeckoId: true } },
    },
    orderBy: { tokenProjectId: "asc" },
  });

  if (startRows.length === 0) {
    throw new ContestRuntimeError("START snapshot is required before END snapshot", 409);
  }

  return startRows.map((row) => ({
    tokenProjectId: row.tokenProjectId,
    slug: row.tokenProject.slug,
    coingeckoId: row.tokenProject.coingeckoId ?? row.geckoId,
  }));
}

function toDecimalInput(value: number | null | undefined): Prisma.Decimal | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Prisma.Decimal(value);
}

function normalizeInt(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.trunc(value);
  return rounded > 0 ? rounded : null;
}

function normalizeDate(value: string | null | undefined): Date | null {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
