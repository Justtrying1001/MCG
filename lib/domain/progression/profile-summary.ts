import { ContestEntryStatus, ContestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  AccountProgressionSummaryV2,
  CollectionProgressionSummaryV2,
  CompetitiveProgressionSummaryV2,
} from "@/types/session";
import type { CollectionProjectionV2 } from "@/lib/domain/projections/contracts";

const ACTIVE_CONTEST_STATUSES: ContestStatus[] = [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE];

const PROGRESSION_WEIGHTS = {
  pointsToXpRatio: 0.35,
  ownedTemplateXp: 12,
  settledContestXp: 40,
  wonContestXp: 120,
  podiumBonusXp: 90,
} as const;

export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, level);
  const n = safeLevel - 1;
  return (30 * n * n) + (70 * n);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) {
    level += 1;
  }
  return level;
}

export function buildAccountProgressionSummary(input: {
  points: number;
  ownedTemplateCount: number;
  settledEntries: number;
  contestsWon: number;
  bestRank: number | null;
  legacyXp?: number;
}): AccountProgressionSummaryV2 {
  const pointsXp = Math.round(Math.max(input.points, 0) * PROGRESSION_WEIGHTS.pointsToXpRatio);
  const collectionXp = Math.max(input.ownedTemplateCount, 0) * PROGRESSION_WEIGHTS.ownedTemplateXp;
  const competitiveXp =
    Math.max(input.settledEntries, 0) * PROGRESSION_WEIGHTS.settledContestXp
    + Math.max(input.contestsWon, 0) * PROGRESSION_WEIGHTS.wonContestXp
    + (input.bestRank != null && input.bestRank <= 3 ? PROGRESSION_WEIGHTS.podiumBonusXp : 0);
  const legacyXp = Math.max(input.legacyXp ?? 0, 0);

  const xp = pointsXp + collectionXp + competitiveXp + legacyXp;
  const level = levelFromXp(xp);
  const levelXpFloor = xpRequiredForLevel(level);
  const levelXpCeil = xpRequiredForLevel(level + 1);
  const rawProgress = ((xp - levelXpFloor) / (levelXpCeil - levelXpFloor)) * 100;
  const progressPct = Number(Math.max(0, Math.min(rawProgress, 100)).toFixed(2));

  return {
    level,
    xp,
    levelXpFloor,
    levelXpCeil,
    progressPct,
    nextMilestoneLevel: level + 1,
    pointsBalance: input.points,
    progressionBreakdown: {
      pointsXp,
      collectionXp,
      competitiveXp,
      legacyXp,
    },
  };
}

function getTopCode(items: Array<{ code: string; count: number }>): string | null {
  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  return sorted[0]?.code ?? null;
}

function buildCollectionProgressionSummary(collectionProjection: CollectionProjectionV2): CollectionProgressionSummaryV2 {
  return {
    totalOwnedInstances: collectionProjection.totalOwnedInstances,
    ownedTemplateCount: collectionProjection.ownedTemplateCount,
    missingTemplateCount: collectionProjection.missingTemplateCount,
    completionPct: collectionProjection.completionPct,
    topRarityCode: getTopCode(collectionProjection.byRarity.map((item) => ({ code: item.rarityCode, count: item.count }))),
    topEditionCode: getTopCode(collectionProjection.byEdition.map((item) => ({ code: item.editionCode, count: item.count }))),
  };
}

export async function buildProgressionSummariesV2(userId: string, points: number, collectionProjection: CollectionProjectionV2): Promise<{
  accountProgression: AccountProgressionSummaryV2;
  collectionProgression: CollectionProgressionSummaryV2;
  competitiveProgression: CompetitiveProgressionSummaryV2;
}> {
  const [userProgression, competitiveProgressionRecord, contestsEntered, activeEntries, settledEntries, rankings, userLeague, activeSeason] = await Promise.all([
    prisma.userProgression.findUnique({ where: { userId }, select: { xp: true } }),
    prisma.competitiveProgression.findUnique({ where: { userId }, select: { contestsWon: true, rating: true } }),
    prisma.contestEntry.count({ where: { userId } }),
    prisma.contestEntry.count({
      where: {
        userId,
        contest: { status: { in: ACTIVE_CONTEST_STATUSES } },
      },
    }),
    prisma.contestEntry.count({ where: { userId, status: ContestEntryStatus.SETTLED } }),
    prisma.contestRanking.findMany({
      where: { userId },
      include: { contest: { select: { id: true, title: true } } },
      orderBy: { rankedAt: "desc" },
      take: 5,
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { league: { select: { tier: true } } } }),
    prisma.season.findFirst({ where: { status: "ACTIVE" }, select: { id: true } }),
  ]);

  const bestRank = rankings.length > 0 ? Math.min(...rankings.map((row) => row.rank)) : null;
  const averageRank =
    rankings.length > 0
      ? Number((rankings.reduce((acc, row) => acc + row.rank, 0) / rankings.length).toFixed(2))
      : null;
  const wonFromRankings = rankings.filter((row) => row.rank === 1).length;

  const seasonStanding = activeSeason
    ? await prisma.seasonLeaderboard.findUnique({
        where: { seasonId_userId: { seasonId: activeSeason.id, userId } },
        select: { rank: true, points: true },
      })
    : null;

  return {
    accountProgression: buildAccountProgressionSummary({
      points,
      ownedTemplateCount: collectionProjection.ownedTemplateCount,
      settledEntries,
      contestsWon: competitiveProgressionRecord?.contestsWon ?? wonFromRankings,
      bestRank,
      legacyXp: userProgression?.xp,
    }),
    collectionProgression: buildCollectionProgressionSummary(collectionProjection),
    competitiveProgression: {
      contestsEntered,
      activeEntries,
      settledEntries,
      contestsWon: competitiveProgressionRecord?.contestsWon ?? wonFromRankings,
      bestRank,
      averageRank,
      rating: competitiveProgressionRecord?.rating ?? null,
      leagueTier: userLeague?.league?.tier ?? null,
      seasonRank: seasonStanding?.rank ?? null,
      seasonPoints: seasonStanding?.points ?? null,
      recentResults: rankings.map((row) => ({
        contestId: row.contest.id,
        contestTitle: row.contest.title,
        rank: row.rank,
        score: row.score,
        rankedAt: row.rankedAt.toISOString(),
      })),
    },
  };
}
