import { ContestEntryStatus, ContestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  AccountProgressionSummaryV2,
  CollectionProgressionSummaryV2,
  CompetitiveProgressionSummaryV2,
} from "@/types/session";
import type { CollectionProjectionV2 } from "@/lib/domain/projections/contracts";
import { levelFromXp, xpRequiredForLevel } from "@/lib/domain/progression/xp-engine";

export { levelFromXp, xpRequiredForLevel } from "@/lib/domain/progression/xp-engine";

const ACTIVE_CONTEST_STATUSES: ContestStatus[] = [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE];

export function buildAccountProgressionSummary(input: {
  xp: number;
  level: number;
  points: number;
}): AccountProgressionSummaryV2 {
  const xp = Math.max(input.xp, 0);
  const level = Math.max(input.level, levelFromXp(xp));
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
      pointsXp: 0,
      collectionXp: 0,
      competitiveXp: 0,
      legacyXp: xp,
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
    prisma.userProgression.findUnique({ where: { userId }, select: { xp: true, level: true } }),
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
      xp: userProgression?.xp ?? 0,
      level: userProgression?.level ?? 1,
      points,
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
