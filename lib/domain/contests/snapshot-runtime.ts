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
  missingGeckoIds: number;
};

export async function captureStartSnapshot(contestId: string) {
  return captureSnapshot(contestId, ContestSnapshotPhase.START);
}

export async function captureEndSnapshot(contestId: string) {
  return captureSnapshot(contestId, ContestSnapshotPhase.END);
}

async function captureSnapshot(contestId: string, phase: ContestSnapshotPhase): Promise<SnapshotCaptureResult> {
  return prisma.$transaction(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { id: contestId }, select: { id: true } });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);

    const tokens = phase === ContestSnapshotPhase.START
      ? await resolveEligibleTokensForContest(contestId, tx)
      : await resolveCanonicalTokensFromStart(contestId, tx);

    if (tokens.length === 0) {
      throw new ContestRuntimeError("No eligible tokens resolved for snapshot", 409);
    }

    const geckoIds = tokens.map((token) => token.coingeckoId).filter((id): id is string => Boolean(id));

    let markets = [] as Awaited<ReturnType<typeof fetchCoinsMarkets>>;
    try {
      markets = await fetchCoinsMarkets(geckoIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ContestRuntimeError(
        `CoinGecko snapshot fetch failed for ${phase} phase (${message}). Contest transition is blocked until snapshot succeeds.`,
        503
      );
    }
    const marketById = new Map(markets.map((row) => [row.id.toLowerCase(), row]));

    let capturedCount = 0;
    let missingGeckoIds = 0;

    for (const token of tokens) {
      if (!token.coingeckoId) {
        missingGeckoIds += 1;
      }

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
        },
      });
      capturedCount += 1;
    }

    return {
      contestId,
      phase,
      tokenCount: tokens.length,
      capturedCount,
      missingGeckoIds,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function resolveCanonicalTokensFromStart(contestId: string, tx: Prisma.TransactionClient) {
  const startRows = await tx.contestTokenSnapshot.findMany({
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
