import { ContestEntryStatus, ContestSnapshotPhase, ContestStatus, Prisma } from "@prisma/client";

import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { prisma } from "@/lib/prisma";

const RARITY_MULTIPLIERS: Record<string, number> = {
  COMMON: 1,
  UNCOMMON: 1.05,
  RARE: 1.12,
  EPIC: 1.22,
  LEGENDARY: 1.35,
};

const EDITION_MULTIPLIERS: Record<string, number> = {
  BASE: 1,
  REVERSE: 1.03,
  BRILLANTE: 1.08,
  HOLO: 1.15,
  FULL_ART: 1.25,
};

const EPS = 1e-9;

type ScoreComputeResult = {
  contestId: string;
  tokenScoresCount: number;
  entryBreakdownsCount: number;
  userScoresCount: number;
  rankingsCount: number;
};

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
    let entryBreakdownsCount = 0;

    for (const entry of entries) {
      let entryTotal = 0;
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
    const ranked = [...userScores].sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId));
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
  return boundedScore(priceChange, 0.5);
}

export function volumeScoreFromChange(volumeChange: number | null) {
  return boundedScore(volumeChange, 1);
}

export function marketCapScoreFromChange(marketCapChange: number | null) {
  return boundedScore(marketCapChange, 0.5);
}

export function rankScoreFromChange(rankChange: number | null) {
  return boundedScore(rankChange, 0.3);
}

export function rankMultiplierFromChange(rankChange: number | null) {
  if (rankChange === null || !Number.isFinite(rankChange)) return 1;
  return 1 + (0.10 * clamp(rankChange / 0.3, 0, 1));
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

  const baseTokenScore = (0.45 * priceScore) + (0.25 * volumeScore) + (0.20 * marketCapScore) + (0.10 * rankScore);
  const rankMultiplier = rankMultiplierFromChange(input.rankChange);
  return Math.min(100, baseTokenScore * rankMultiplier);
}

function boundedScore(change: number | null, denominator: number) {
  if (change === null || !Number.isFinite(change)) return 0;
  return 50 + (50 * clamp(change / denominator, -1, 1));
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
