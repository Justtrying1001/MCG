import { LeagueTier, SeasonStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_RATING = 1200;

function ratingDeltaFromPercentile(percentile: number) {
  if (percentile <= 0.1) return { rating: 20, points: 25 };
  if (percentile <= 0.3) return { rating: 10, points: 15 };
  if (percentile >= 0.7) return { rating: -10, points: 2 };
  return { rating: 0, points: 8 };
}

function getLeagueForRating(leagues: Array<{ id: string; minRating: number; maxRating: number }>, rating: number) {
  return leagues.find((league) => rating >= league.minRating && rating <= league.maxRating) ?? null;
}

export async function listSeasonsOverview(userId?: string) {
  const seasons = await prisma.season.findMany({
    orderBy: [{ startsAt: "desc" }],
    take: 6,
    include: {
      _count: { select: { contests: true, leaderboardRows: true } },
    },
  });

  const rowsBySeason = new Map<string, Array<{ userId: string; points: number; rank: number | null; user: { displayName: string; xUsername: string } }>>();
  const userRows = new Map<string, { rank: number | null; points: number }>();

  await Promise.all(seasons.map(async (season) => {
    const rows = await prisma.seasonLeaderboard.findMany({
      where: { seasonId: season.id },
      orderBy: [{ rank: "asc" }, { points: "desc" }],
      take: 10,
      include: { user: { select: { id: true, displayName: true, xUsername: true } } },
    });
    rowsBySeason.set(season.id, rows.map((row) => ({
      userId: row.userId,
      points: row.points,
      rank: row.rank,
      user: { displayName: row.user.displayName, xUsername: row.user.xUsername },
    })));

    if (userId) {
      const me = await prisma.seasonLeaderboard.findUnique({
        where: { seasonId_userId: { seasonId: season.id, userId } },
        select: { rank: true, points: true },
      });
      if (me) userRows.set(season.id, me);
    }
  }));

  return seasons.map((season) => ({
    id: season.id,
    name: season.name,
    status: season.status,
    startsAt: season.startsAt,
    endsAt: season.endsAt,
    contestsCount: season._count.contests,
    playersCount: season._count.leaderboardRows,
    leaderboard: rowsBySeason.get(season.id) ?? [],
    myStanding: userRows.get(season.id) ?? null,
  }));
}

export async function syncSeasonProgressForContest(contestId: string) {
  return prisma.$transaction(async (tx) => {
    const contest = await tx.contest.findUnique({
      where: { id: contestId },
      include: { season: true },
    });

    if (!contest?.seasonId || !contest.season || contest.status !== "SETTLED") {
      return { synced: false, reason: "contest_not_eligible" as const };
    }

    const rankings = await tx.contestRanking.findMany({
      where: { contestId },
      orderBy: { rank: "asc" },
      select: { userId: true, rank: true },
    });

    if (rankings.length === 0) {
      return { synced: false, reason: "no_rankings" as const };
    }

    const leagues = await tx.league.findMany({ orderBy: { minRating: "asc" }, select: { id: true, minRating: true, maxRating: true } });

    for (const row of rankings) {
      const percentile = rankings.length > 0 ? row.rank / rankings.length : 1;
      const deltas = ratingDeltaFromPercentile(percentile);

      const existing = await tx.contestRatingChange.findUnique({
        where: { contestId_userId: { contestId, userId: row.userId } },
        select: { id: true },
      });
      if (existing) continue;

      const ratingRow = await tx.userContestRating.upsert({
        where: { userId_seasonId: { userId: row.userId, seasonId: contest.seasonId } },
        update: {},
        create: { userId: row.userId, seasonId: contest.seasonId, rating: DEFAULT_RATING },
      });

      const nextRating = Math.max(0, ratingRow.rating + deltas.rating);

      await tx.contestRatingChange.create({
        data: {
          contestId,
          seasonId: contest.seasonId,
          userId: row.userId,
          rank: row.rank,
          percentile,
          ratingDelta: deltas.rating,
          pointsDelta: deltas.points,
        },
      });

      await tx.userContestRating.update({
        where: { id: ratingRow.id },
        data: { rating: nextRating, lastUpdatedAt: new Date() },
      });

      const league = getLeagueForRating(leagues, nextRating);
      await tx.user.update({ where: { id: row.userId }, data: { leagueId: league?.id ?? null } });

      await tx.seasonLeaderboard.upsert({
        where: { seasonId_userId: { seasonId: contest.seasonId, userId: row.userId } },
        update: { points: { increment: deltas.points } },
        create: { seasonId: contest.seasonId, userId: row.userId, points: deltas.points },
      });
    }

    const finalRows = await tx.seasonLeaderboard.findMany({
      where: { seasonId: contest.seasonId },
      orderBy: [{ points: "desc" }, { updatedAt: "asc" }],
      select: { id: true },
    });

    for (let i = 0; i < finalRows.length; i += 1) {
      await tx.seasonLeaderboard.update({ where: { id: finalRows[i]!.id }, data: { rank: i + 1 } });
    }

    return { synced: true, rows: rankings.length };
  });
}

export async function ensureDefaultLeagues() {
  const defaults: Array<{ name: string; tier: LeagueTier; minRating: number; maxRating: number }> = [
    { name: "Bronze", tier: "BRONZE", minRating: 0, maxRating: 1299 },
    { name: "Silver", tier: "SILVER", minRating: 1300, maxRating: 1499 },
    { name: "Gold", tier: "GOLD", minRating: 1500, maxRating: 1699 },
    { name: "Diamond", tier: "DIAMOND", minRating: 1700, maxRating: 1899 },
    { name: "Legend", tier: "LEGEND", minRating: 1900, maxRating: 9999 },
  ];

  await Promise.all(defaults.map((league) => prisma.league.upsert({
    where: { tier: league.tier },
    update: { name: league.name, minRating: league.minRating, maxRating: league.maxRating },
    create: league,
  })));
}

export async function ensureCurrentSeason() {
  const now = new Date();
  const active = await prisma.season.findFirst({ where: { status: SeasonStatus.ACTIVE, startsAt: { lte: now }, endsAt: { gte: now } } });
  if (active) return active;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 28);

  const count = await prisma.season.count();
  return prisma.season.create({
    data: {
      name: `Season ${count + 1}`,
      startsAt: start,
      endsAt: end,
      status: SeasonStatus.ACTIVE,
    },
  });
}
