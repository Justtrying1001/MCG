import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    contestSettlementPlan: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { executeSettlementPlan, generateSettlementPlan, previewSettlementPlan } from "@/lib/domain/contests/settlement-plan-runtime";

describe("settlement plan runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates cumulative rewards when multiple rules match the same rank", async () => {
    const tx: any = {
      contest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "c1",
          configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
          settlements: [],
          rankings: [
            { userId: "u1", rank: 1, score: 100 },
            { userId: "u2", rank: 2, score: 90 },
          ],
          rewardPolicy: {
            id: "rp1",
            status: "PUBLISHED",
            bundles: [
              { id: "b1", components: [{ type: "POINTS", pointsAmount: 500, xpAmount: null, packDefinitionId: null, packQuantity: null }] },
              { id: "b2", components: [{ type: "PACK", pointsAmount: null, xpAmount: null, packDefinitionId: "pack1", packQuantity: 2 }] },
            ],
            distributionRules: [
              { id: "r1", priority: 1, ruleType: "TOP_N", rankFrom: null, rankTo: null, topN: 2, topPercent: null, poolAmount: null, bundleId: "b1" },
              { id: "r2", priority: 2, ruleType: "FIXED_RANKS", rankFrom: 1, rankTo: 1, topN: null, topPercent: null, poolAmount: null, bundleId: "b2" },
            ],
          },
        }),
      },
      contestSettlementPlan: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockImplementation(async ({ data }: any) => ({
          id: "sp1",
          status: "DRAFT",
          contestId: data.contestId,
          items: data.items.createMany.data.map((item: any, index: number) => ({ id: `i${index + 1}`, ...item })),
        })),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await generateSettlementPlan("c1");

    expect(result.planId).toBe("sp1");
    expect(result.matchedUsers).toBe(2);
    expect(result.totals.pointsCreditTotal).toBe(1000);
    expect(result.totals.packsGrantTotal).toBe(2);
  });

  it("applies POINTS_POOL_TOP_PERCENT and distributes remainder from best rank", async () => {
    const tx: any = {
      contest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "c1",
          configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
          settlements: [],
          rankings: [
            { userId: "u1", rank: 1, score: 100 },
            { userId: "u2", rank: 2, score: 90 },
            { userId: "u3", rank: 3, score: 80 },
          ],
          rewardPolicy: {
            id: "rp1",
            status: "PUBLISHED",
            bundles: [{ id: "b1", components: [{ type: "POINTS", pointsAmount: 1, xpAmount: null, packDefinitionId: null, packQuantity: null }] }],
            distributionRules: [
              { id: "r1", priority: 1, ruleType: "POINTS_POOL_TOP_PERCENT", rankFrom: null, rankTo: null, topN: null, topPercent: 50, poolAmount: 100, bundleId: "b1" },
            ],
          },
        }),
      },
      contestSettlementPlan: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockImplementation(async ({ data }: any) => ({
          id: "sp1",
          status: "DRAFT",
          contestId: data.contestId,
          items: data.items.createMany.data.map((item: any, index: number) => ({ id: `i${index + 1}`, ...item })),
        })),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await generateSettlementPlan("c1");

    expect(result.matchedUsers).toBe(2);
    expect(result.totals.pointsCreditTotal).toBe(100);
  });

  it("previews plan with totals", async () => {
    prismaMock.contestSettlementPlan.findUnique.mockResolvedValue({
      id: "sp1",
      contestId: "c1",
      status: "DRAFT",
      generatedAt: new Date("2026-03-12T00:00:00.000Z"),
      rankingSnapshotSize: 3,
      contest: { id: "c1", code: "W1", title: "Week 1", status: "LIVE" },
      items: [
        { id: "i1", rank: 1, userId: "u1", user: { id: "u1", displayName: "U1", xUsername: "u1" }, sourceRuleId: "r1", sourceRuleType: "FIXED_RANKS", sourceBundleId: "b1", rewardComponents: [{ type: "POINTS", amount: 100 }], pointsTotal: 100, xpTotal: 0, packsTotal: 0 },
      ],
    });

    const preview = await previewSettlementPlan("sp1", "c1");
    expect(preview.totals.usersCount).toBe(1);
    expect(preview.totals.pointsCreditTotal).toBe(100);
  });

  it("execute is idempotent when plan already executed", async () => {
    const tx: any = {
      contestSettlementPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sp1",
          contestId: "c1",
          status: "EXECUTED",
          items: [{ id: "i1" }],
          contest: { settlements: [] },
        }),
      },
      contestSettlement: {
        findUnique: vi.fn().mockResolvedValue({ id: "s1" }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await executeSettlementPlan("sp1");
    expect(result.executed).toBe(false);
    expect(result.settlementId).toBe("s1");
  });

  it("execute keeps roster locks to preserve settled lineup history", async () => {
    const tx: any = {
      contestSettlementPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sp1",
          contestId: "c1",
          status: "DRAFT",
          items: [
            {
              userId: "u1",
              rewardComponents: [{ type: "POINTS", amount: 10 }],
            },
          ],
          contest: { settlements: [] },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      contestSettlement: {
        create: vi.fn().mockResolvedValue({ id: "s1" }),
      },
      rewardGrant: {
        create: vi.fn().mockResolvedValue({}),
      },
      user: {
        update: vi.fn().mockResolvedValue({}),
      },
      contest: {
        update: vi.fn().mockResolvedValue({}),
      },
      contestEntry: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      rosterLock: {
        deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
      },
      userProgression: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await executeSettlementPlan("sp1");

    expect(tx.rosterLock.deleteMany).not.toHaveBeenCalled();
  });
});
