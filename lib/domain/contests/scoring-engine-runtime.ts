import { ContestEntryStatus, ContestSnapshotPhase, ContestStatus, Prisma } from "@prisma/client";

import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { prisma } from "@/lib/prisma";

const RARITY_MULTIPLIERS: Record<string, number> = {
  COMMON: 1,
  UNCOMMON: 1.03,
  RARE: 1.07,
  EPIC: 1.12,
  LEGENDARY: 1.18,
};

const EDITION_MULTIPLIERS: Record<string, number> = {
  BASE: 1,
  REVERSE: 1.02,
  BRILLANTE: 1.04,
  HOLO: 1.07,
  FULL_ART: 1.11,
};

const EPS = 1e-9;
const NEUTRAL_SCORE = 50;
const POSITIVE_TOKEN_THRESHOLD = 50;

type ScoreComputeResult = {
  contestId: string;
  tokenScoresCount: number;
  entryBreakdownsCount: number;
  userScoresCount: number;
  rankingsCount: number;
};

export type ContestUserRankingStats = {
  rawTokenScoreSum: number;
  positiveTokenCount: number;
  bestTokenScore: number;
};

export function compareContestRankingRows(
  a: { userId: string; score: number },
  b: { userId: string; score: number },
  statsByUserId: Map<string, ContestUserRankingStats>
) {
  const scoreDiff = b.score - a.score;
  if (Math.abs(scoreDiff) > EPS) return scoreDiff;

  const aStats = statsByUserId.get(a.userId) ?? { rawTokenScoreSum: 0, positiveTokenCount: 0, bestTokenScore: 0 };
  const bStats = statsByUserId.get(b.userId) ?? { rawTokenScoreSum: 0, positiveTokenCount: 0, bestTokenScore: 0 };

  const rawTokenScoreSumDiff = bStats.rawTokenScoreSum - aStats.rawTokenScoreSum;
  if (Math.abs(rawTokenScoreSumDiff) > EPS) return rawTokenScoreSumDiff;

  const positiveTokenCountDiff = bStats.positiveTokenCount - aStats.positiveTokenCount;
  if (positiveTokenCountDiff !== 0) return positiveTokenCountDiff;

  const bestTokenScoreDiff = bStats.bestTokenScore - aStats.bestTokenScore;
  if (Math.abs(bestTokenScoreDiff) > EPS) return bestTokenScoreDiff;

  return a.userId.localeCompare(b.userId);
}

export async function computeContestScoresFromSnapshots(contestId: string): Promise<ScoreComputeResult> {
  return prisma.$transaction(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { id: contestId }, select: { id: true, status: true } });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);
    if (contest.status !== ContestStatus.LOCKED && contest.status !== ContestStatus.LIVE) {
      throw new ContestRuntimeError("Contest must be LOCKED or LIVE to compute scores", 409);
    }

    const startRows = await tx.contestTokenSnapshot.findMany({
      where: { contestId, phase: ContestSnapshotPhase.START },
      select: {
        tokenProjectId: true,
        priceUsd: true,
        marketCapUsd: true,
        volume24hUsd: true,
        marketCapRank: true,
      },
    });
    const endRows = await tx.contestTokenSnapshot.findMany({
      where: { contestId, phase: ContestSnapshotPhase.END },
      select: {
        tokenProjectId: true,
        priceUsd: true,
        marketCapUsd: true,
        volume24hUsd: true,
        marketCapRank: true,
      },
    });

    if (startRows.length === 0 || endRows.length === 0) {
      throw new ContestRuntimeError("Both START and END snapshots are required", 409);
    }

    const startRowsWithPrice = startRows.filter((r) => r.priceUsd !== null);
    if (startRowsWithPrice.length === 0) {
      throw new ContestRuntimeError(
        `START snapshot exists but has no price data (${startRows.length} token${startRows.length !== 1 ? "s" : ""}, 0 with price). Re-capture the START snapshot before scoring.`,
        409
      );
    }
    if (startRowsWithPrice.length < startRows.length) {
      console.warn(
        `[scoring] Contest ${contestId} START snapshot is partial: ${startRowsWithPrice.length}/${startRows.length} tokens have price data. Scoring will be degraded.`
      );
    }

    const startByToken = new Map(startRows.map((row) => [row.tokenProjectId, row]));
    const endByToken = new Map(endRows.map((row) => [row.tokenProjectId, row]));

    const tokenScores: Array<{ tokenProjectId: string; score: number; priceChange: number | null; marketCapChange: number | null; volumeChange: number | null; rankChange: number | null; dataQuality: string }> = [];

    for (const [tokenProjectId, start] of startByToken.entries()) {
      const end = endByToken.get(tokenProjectId);
      if (!end) continue;

      const priceChange = relativeChange(start.priceUsd, end.priceUsd);
      const marketCapChange = relativeChange(start.marketCapUsd, end.marketCapUsd);
      const volumeChange = relativeChange(start.volume24hUsd, end.volume24hUsd);
      const rankChange = rankRelativeChange(start.marketCapRank, end.marketCapRank);

      const isIncomplete = priceChange === null || marketCapChange === null || volumeChange === null;
      const dataQuality = isIncomplete ? "INCOMPLETE" : "COMPLETE";
      if (isIncomplete) {
        console.warn(`[scoring] Token ${tokenProjectId} in contest ${contestId} has incomplete market data — score computed from partial data`);
      }

      const score = computeTokenScore({ priceChange, marketCapChange, volumeChange, rankChange });
      tokenScores.push({ tokenProjectId, score, priceChange, marketCapChange, volumeChange, rankChange, dataQuality });

      await tx.contestTokenScore.upsert({
        where: { contestId_tokenProjectId: { contestId, tokenProjectId } },
        create: {
          contestId,
          tokenProjectId,
          score,
          priceChange,
          marketCapChange,
          volumeChange,
          rankChange,
        },
        update: {
          score,
          priceChange,
          marketCapChange,
          volumeChange,
          rankChange,
          computedAt: new Date(),
        },
      });
    }

    const tokenScoreByProject = new Map(tokenScores.map((row) => [row.tokenProjectId, row.score]));
    const tokenDataQualityByProject = new Map(tokenScores.map((row) => [row.tokenProjectId, row.dataQuality]));

    const entries = await tx.contestEntry.findMany({
      where: { contestId },
      include: {
        rosterLocks: {
          include: {
            ownedCardInstance: {
              include: {
                cardTemplate: {
                  select: {
                    tokenProjectId: true,
                    rarity: { select: { code: true } },
                    edition: { select: { code: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    await tx.contestEntryScoreBreakdown.deleteMany({ where: { entry: { contestId } } });

    const userScoreMap = new Map<string, number>();
    const userRankingStatsMap = new Map<string, ContestUserRankingStats>();
    let entryBreakdownsCount = 0;

    for (const entry of entries) {
      let entryTotal = 0;
      let rawTokenScoreSum = 0;
      let positiveTokenCount = 0;
      let bestTokenScore = Number.NEGATIVE_INFINITY;
      for (const lock of entry.rosterLocks) {
        const tokenProjectId = lock.ownedCardInstance.cardTemplate.tokenProjectId;
        const baseScore = tokenScoreByProject.get(tokenProjectId) ?? 0;
        const dataQuality = tokenDataQualityByProject.get(tokenProjectId) ?? "COMPLETE";

        const rarityCode = lock.ownedCardInstance.cardTemplate.rarity?.code ?? "COMMON";
        const editionCode = lock.ownedCardInstance.cardTemplate.edition?.code ?? "BASE";
        const rarityMultiplier = RARITY_MULTIPLIERS[rarityCode] ?? 1;
        const editionMultiplier = EDITION_MULTIPLIERS[editionCode] ?? 1;
        const finalScore = baseScore * rarityMultiplier * editionMultiplier;

        entryTotal += finalScore;
        rawTokenScoreSum += baseScore;
        if (baseScore > POSITIVE_TOKEN_THRESHOLD) positiveTokenCount += 1;
        bestTokenScore = Math.max(bestTokenScore, baseScore);

        await tx.contestEntryScoreBreakdown.create({
          data: {
            entryId: entry.id,
            tokenProjectId,
            cardInstanceId: lock.ownedCardInstanceId,
            rosterLockId: lock.id,
            baseScore,
            rarityMultiplier,
            editionMultiplier,
            finalScore,
            dataQuality,
          },
        });
        entryBreakdownsCount += 1;
      }

      userScoreMap.set(entry.userId, entryTotal);
      userRankingStatsMap.set(entry.userId, {
        rawTokenScoreSum,
        positiveTokenCount,
        bestTokenScore: bestTokenScore === Number.NEGATIVE_INFINITY ? 0 : bestTokenScore,
      });
    }

    const userScores = [...userScoreMap.entries()].map(([userId, score]) => ({ userId, score }));

    for (const row of userScores) {
      await tx.contestScore.upsert({
        where: { contestId_userId: { contestId, userId: row.userId } },
        create: { contestId, userId: row.userId, score: row.score },
        update: { score: row.score, scoredAt: new Date() },
      });
    }

    await tx.contestRanking.deleteMany({ where: { contestId } });
    const ranked = [...userScores].sort((a, b) => compareContestRankingRows(a, b, userRankingStatsMap));
    if (ranked.length > 0) {
      await tx.contestRanking.createMany({
        data: ranked.map((row, index) => ({ contestId, userId: row.userId, rank: index + 1, score: row.score })),
      });
    }

    await tx.contestEntry.updateMany({ where: { contestId }, data: { status: ContestEntryStatus.SCORED } });

    return {
      contestId,
      tokenScoresCount: tokenScores.length,
      entryBreakdownsCount,
      userScoresCount: userScores.length,
      rankingsCount: ranked.length,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function priceScoreFromChange(priceChange: number | null) {
  return boundedScore(priceChange, 0.45);
}

export function volumeScoreFromChange(volumeChange: number | null) {
  return boundedScore(volumeChange, 0.75);
}

export function marketCapScoreFromChange(marketCapChange: number | null) {
  return boundedScore(marketCapChange, 0.7);
}

export function rankScoreFromChange(rankChange: number | null) {
  return boundedScore(rankChange, 0.3);
}

export function momentumMultiplierFromChanges(volumeChange: number | null, rankChange: number | null) {
  const volumeContribution = volumeChange === null || !Number.isFinite(volumeChange)
    ? 0
    : 0.04 * clamp(volumeChange / 0.75, 0, 1);
  const rankContribution = rankChange === null || !Number.isFinite(rankChange)
    ? 0
    : 0.03 * clamp(rankChange / 0.3, 0, 1);
  return 1 + volumeContribution + rankContribution;
}

export function computeTokenScore(input: {
  priceChange: number | null;
  marketCapChange: number | null;
  volumeChange: number | null;
  rankChange: number | null;
}) {
  const priceScore = priceScoreFromChange(input.priceChange);
  const volumeScore = volumeScoreFromChange(input.volumeChange);
  const marketCapScore = marketCapScoreFromChange(input.marketCapChange);
  const rankScore = rankScoreFromChange(input.rankChange);

  const baseTokenScore = (0.40 * priceScore) + (0.30 * volumeScore) + (0.15 * marketCapScore) + (0.15 * rankScore);
  const momentumMultiplier = momentumMultiplierFromChanges(input.volumeChange, input.rankChange);
  return clamp(baseTokenScore * momentumMultiplier, 0, 105);
}

function boundedScore(change: number | null, denominator: number) {
  if (change === null || !Number.isFinite(change)) return NEUTRAL_SCORE;
  return NEUTRAL_SCORE + (50 * clamp(change / denominator, -1, 1));
}

function relativeChange(start: Prisma.Decimal | null, end: Prisma.Decimal | null): number | null {
  if (!start || !end) return null;
  const s = start.toNumber();
  const e = end.toNumber();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
  return (e - s) / Math.max(s, EPS);
}

function rankRelativeChange(start: number | null, end: number | null): number | null {
  if (!start || !end || start <= 0) return null;
  return (start - end) / Math.max(start, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function rarityMultiplierForCode(code: string) {
  return RARITY_MULTIPLIERS[code] ?? 1;
}

export function editionMultiplierForCode(code: string) {
  return EDITION_MULTIPLIERS[code] ?? 1;
}
