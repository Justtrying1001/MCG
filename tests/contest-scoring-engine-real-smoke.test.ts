import { afterAll, describe, expect, it } from "vitest";
import { ContestSnapshotPhase, ContestStatus, RewardType } from "@prisma/client";

import { enterContestMvp, settleContestMvp } from "@/lib/domain/contests/runtime";
import { captureEndSnapshot, captureStartSnapshot } from "@/lib/domain/contests/snapshot-runtime";
import { computeContestScoresFromSnapshots } from "@/lib/domain/contests/scoring-engine-runtime";
import { prisma } from "@/lib/prisma";

describe("contest scoring engine real smoke", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const run = hasDb ? it : it.skip;

  const createdContestIds: string[] = [];
  const createdUserIds: string[] = [];


  const originalFetch = global.fetch;

  afterAll(async () => {
    if (!hasDb) return;
    if (process.env.KEEP_SMOKE_DATA === "1") {
      await prisma.$disconnect();
      return;
    }

    if (createdContestIds.length > 0) {
      await prisma.rewardGrant.deleteMany({ where: { sourceContestSettlement: { contestId: { in: createdContestIds } } } });
      await prisma.contestSettlement.deleteMany({ where: { contestId: { in: createdContestIds } } });
      await prisma.contestRanking.deleteMany({ where: { contestId: { in: createdContestIds } } });
      await prisma.contestScore.deleteMany({ where: { contestId: { in: createdContestIds } } });
      await prisma.contestEntryScoreBreakdown.deleteMany({ where: { entry: { contestId: { in: createdContestIds } } } });
      await prisma.contestTokenScore.deleteMany({ where: { contestId: { in: createdContestIds } } });
      await prisma.contestTokenSnapshot.deleteMany({ where: { contestId: { in: createdContestIds } } });
      await prisma.rosterLock.deleteMany({ where: { contestEntry: { contestId: { in: createdContestIds } } } });
      await prisma.contestEntry.deleteMany({ where: { contestId: { in: createdContestIds } } });
      await prisma.contestRule.deleteMany({ where: { contestId: { in: createdContestIds } } });
      await prisma.contest.deleteMany({ where: { id: { in: createdContestIds } } });
    }

    if (createdUserIds.length > 0) {
      await prisma.ownedCardInstance.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }

    global.fetch = originalFetch;
    await prisma.$disconnect();
  });

  run("runs START -> END -> compute -> ranking -> settlement on real DB", async () => {
    const suffix = Date.now().toString(36);

    const [userA, userB] = await Promise.all([
      prisma.user.create({
        data: { xUserId: `smoke_a_${suffix}`, inviteCode: `SMOKEA${suffix.toUpperCase()}`, xUsername: `smoke_a_${suffix}`, displayName: "Smoke A", points: 1000 },
      }),
      prisma.user.create({
        data: { xUserId: `smoke_b_${suffix}`, inviteCode: `SMOKEB${suffix.toUpperCase()}`, xUsername: `smoke_b_${suffix}`, displayName: "Smoke B", points: 1000 },
      }),
    ]);
    createdUserIds.push(userA.id, userB.id);

    const templates = await prisma.cardTemplate.findMany({
      where: { isActive: true },
      include: { rarity: true, edition: true },
      orderBy: [{ tokenProjectId: "asc" }, { rarity: { weight: "desc" } }, { edition: { weight: "desc" } }],
      take: 200,
    });

    const legendaryFullArt = templates.filter((t) => t.rarity.code === "LEGENDARY" && t.edition.code === "FULL_ART").slice(0, 5);
    const commonBase = templates.filter((t) => t.rarity.code === "COMMON" && t.edition.code === "BASE").slice(0, 5);
    expect(legendaryFullArt).toHaveLength(5);
    expect(commonBase).toHaveLength(5);

    const userAInstances = await Promise.all(
      legendaryFullArt.map((template, i) => prisma.ownedCardInstance.create({ data: { userId: userA.id, cardTemplateId: template.id, metadata: { smoke: true, slot: i } } }))
    );
    const userBInstances = await Promise.all(
      commonBase.map((template, i) => prisma.ownedCardInstance.create({ data: { userId: userB.id, cardTemplateId: template.id, metadata: { smoke: true, slot: i } } }))
    );

    const contest = await prisma.contest.create({
      data: {
        code: `SMOKE_${suffix}`,
        title: `Smoke ${suffix}`,
        status: ContestStatus.OPEN,
        startsAt: new Date(Date.now() - 60_000),
        lockAt: new Date(Date.now() + 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        rules: { create: { maxRosterSize: 5, teamSizeMode: "EXACT", teamSizeValue: 5, eligibilityMode: "ANY", entryFeeEnabled: false } },
      },
      include: { rules: true },
    });
    createdContestIds.push(contest.id);

    await enterContestMvp({ contestId: contest.id, userId: userA.id, lineupInstanceIds: userAInstances.map((x) => x.id) });
    await enterContestMvp({ contestId: contest.id, userId: userB.id, lineupInstanceIds: userBInstances.map((x) => x.id) });

    await prisma.contest.update({ where: { id: contest.id }, data: { status: ContestStatus.LOCKED } });

    global.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const parsed = new URL(url);
      const ids = (parsed.searchParams.get("ids") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      return new Response(JSON.stringify(ids.map((id, index) => ({
        id,
        current_price: 1 + index,
        market_cap: 1000 + index * 10,
        total_volume: 100 + index * 5,
        market_cap_rank: index + 1,
        last_updated: "2026-03-14T10:00:00Z",
      }))), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;

    const start = await captureStartSnapshot(contest.id);
    const end = await captureEndSnapshot(contest.id);

    expect(start.tokenCount).toBeGreaterThan(0);
    expect(end.tokenCount).toBe(start.tokenCount);

    const tokenA = legendaryFullArt[0].tokenProjectId;
    const tokenB = commonBase[0].tokenProjectId;

    const [startA, startB] = await Promise.all([
      prisma.contestTokenSnapshot.findUnique({ where: { contestId_tokenProjectId_phase: { contestId: contest.id, tokenProjectId: tokenA, phase: ContestSnapshotPhase.START } } }),
      prisma.contestTokenSnapshot.findUnique({ where: { contestId_tokenProjectId_phase: { contestId: contest.id, tokenProjectId: tokenB, phase: ContestSnapshotPhase.START } } }),
    ]);
    expect(startA).toBeTruthy();
    expect(startB).toBeTruthy();

    await prisma.contestTokenSnapshot.update({
      where: { contestId_tokenProjectId_phase: { contestId: contest.id, tokenProjectId: tokenA, phase: ContestSnapshotPhase.END } },
      data: {
        priceUsd: startA!.priceUsd ? startA!.priceUsd.mul(2) : null,
        marketCapUsd: startA!.marketCapUsd ? startA!.marketCapUsd.mul(2) : null,
        volume24hUsd: startA!.volume24hUsd ? startA!.volume24hUsd.mul(2) : null,
        marketCapRank: startA!.marketCapRank ? Math.max(1, startA!.marketCapRank - 5) : 1,
      },
    });

    await prisma.contestTokenSnapshot.update({
      where: { contestId_tokenProjectId_phase: { contestId: contest.id, tokenProjectId: tokenB, phase: ContestSnapshotPhase.END } },
      data: {
        priceUsd: startB!.priceUsd ? startB!.priceUsd.mul(0.5) : null,
        marketCapUsd: startB!.marketCapUsd ? startB!.marketCapUsd.mul(0.5) : null,
        volume24hUsd: startB!.volume24hUsd ? startB!.volume24hUsd.mul(0.5) : null,
        marketCapRank: startB!.marketCapRank ? startB!.marketCapRank + 10 : 99999,
      },
    });

    const compute = await computeContestScoresFromSnapshots(contest.id);

    expect(compute.tokenScoresCount).toBeGreaterThan(0);
    expect(compute.entryBreakdownsCount).toBe(10);
    expect(compute.userScoresCount).toBe(2);
    expect(compute.rankingsCount).toBe(2);

    const [scores, ranking, breakdowns] = await Promise.all([
      prisma.contestScore.findMany({ where: { contestId: contest.id }, orderBy: { score: "desc" } }),
      prisma.contestRanking.findMany({ where: { contestId: contest.id }, orderBy: { rank: "asc" } }),
      prisma.contestEntryScoreBreakdown.findMany({
        where: { entry: { contestId: contest.id } },
        include: { entry: true, cardInstance: { include: { cardTemplate: { include: { rarity: true, edition: true } } } } },
      }),
    ]);

    expect(scores).toHaveLength(2);
    expect(ranking).toHaveLength(2);
    expect(ranking[0]?.userId).toBe(scores[0]?.userId);

    const aLegendary = breakdowns.find((b) => b.entry.userId === userA.id && b.cardInstance.cardTemplate.rarity.code === "LEGENDARY");
    const bCommon = breakdowns.find((b) => b.entry.userId === userB.id && b.cardInstance.cardTemplate.rarity.code === "COMMON");
    expect(aLegendary).toBeTruthy();
    expect(bCommon).toBeTruthy();
    expect(aLegendary!.rarityMultiplier).toBeGreaterThan(bCommon!.rarityMultiplier);
    expect(aLegendary!.editionMultiplier).toBeGreaterThanOrEqual(1);

    const settlement = await settleContestMvp({
      contestId: contest.id,
      rewards: [{ userId: ranking[0]!.userId, type: RewardType.POINTS, amount: 25 }],
    });
    expect(settlement.rewardCount).toBe(1);

    const [contestAfter, grants] = await Promise.all([
      prisma.contest.findUnique({ where: { id: contest.id } }),
      prisma.rewardGrant.findMany({ where: { sourceContestSettlementId: settlement.settlementId } }),
    ]);

    expect(contestAfter?.status).toBe(ContestStatus.SETTLED);
    expect(grants).toHaveLength(1);

    // useful for operational smoke runs in CI/terminal logs
    console.info("SMOKE_RESULT", {
      contestId: contest.id,
      startTokenCount: start.tokenCount,
      endTokenCount: end.tokenCount,
      tokenScoresCount: compute.tokenScoresCount,
      entryBreakdownsCount: compute.entryBreakdownsCount,
      userScores: scores.map((s) => ({ userId: s.userId, score: s.score })),
      ranking: ranking.map((r) => ({ rank: r.rank, userId: r.userId, score: r.score })),
      settlementId: settlement.settlementId,
    });
  }, 120_000);
});
