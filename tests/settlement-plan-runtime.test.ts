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

  it("generates rewards from simple pool config", async () => {
    const tx: any = {
      contest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "c1",
          _count: { entries: 4 },
          configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
          settlements: [],
          rules: [{ config: { rewardConfig: { pointsPool: 100, packPool: 5, rewardedTopPercent: 50, distributionProfile: "balanced" } } }],
          rankings: [
            { userId: "u1", rank: 1, score: 100 },
            { userId: "u2", rank: 2, score: 90 },
            { userId: "u3", rank: 3, score: 80 },
            { userId: "u4", rank: 4, score: 70 },
          ],
          rewardPolicy: {
            id: "rp1",
            status: "PUBLISHED",
            bundles: [],
            distributionRules: [],
          },
        }),
      },
      packDefinition: {
        findFirst: vi.fn().mockResolvedValue({ id: "pack1" }),
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
    expect(result.totals.pointsCreditTotal).toBe(100);
    expect(result.totals.packsGrantTotal).toBe(5);
  });

  it("generates an empty settlement plan for zero-entry contests", async () => {
    const createMock = vi.fn().mockImplementation(async ({ data }: any) => ({
      id: "sp-empty",
      status: "DRAFT",
      contestId: data.contestId,
      items: [],
    }));
    const tx: any = {
      contest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "c-empty",
          _count: { entries: 0 },
          configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
          settlements: [],
          rules: [{ config: { rewardConfig: { pointsPool: 100, packPool: 0, rewardedTopPercent: 50, distributionProfile: "balanced" } } }],
          rankings: [],
          rewardPolicy: {
            id: "rp1",
            status: "PUBLISHED",
            bundles: [],
            distributionRules: [],
          },
        }),
      },
      packDefinition: {
        findFirst: vi.fn().mockResolvedValue({ id: "pack1" }),
      },
      contestSettlementPlan: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: createMock,
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await generateSettlementPlan("c-empty");

    expect(result.planId).toBe("sp-empty");
    expect(result.rankingSize).toBe(0);
    expect(result.matchedUsers).toBe(0);
    expect(result.totals).toEqual({
      usersCount: 0,
      pointsCreditTotal: 0,
      xpCreditTotal: 0,
      packsGrantTotal: 0,
      rewardActionsCount: 0,
    });
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ items: expect.anything() }),
    }));
  });

  it("keeps strict error when entrants exist but rankings are missing", async () => {
    const tx: any = {
      contest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "c1",
          _count: { entries: 2 },
          configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
          settlements: [],
          rules: [{ config: { rewardConfig: { pointsPool: 100, packPool: 0, rewardedTopPercent: 50, distributionProfile: "balanced" } } }],
          rankings: [],
          rewardPolicy: {
            id: "rp1",
            status: "PUBLISHED",
            bundles: [],
            distributionRules: [],
          },
        }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(generateSettlementPlan("c1")).rejects.toThrow(/Cannot generate settlement plan without ranking rows/i);
  });

  it("keeps settlement generation unchanged for published reward-policy tiers", async () => {
    const tx: any = {
      contest: {
        findUnique: vi.fn().mockResolvedValue({
          id: "c-policy",
          _count: { entries: 4 },
          configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
          settlements: [],
          rules: [{ config: {} }],
          rankings: [
            { userId: "u1", rank: 1, score: 100 },
            { userId: "u2", rank: 2, score: 90 },
            { userId: "u3", rank: 3, score: 80 },
            { userId: "u4", rank: 4, score: 70 },
          ],
          rewardPolicy: {
            id: "rp1",
            status: "PUBLISHED",
            bundles: [
              {
                id: "bundle-a",
                name: "Top 2",
                components: [
                  { type: "POINTS", pointsAmount: 75, xpAmount: null, packDefinitionId: null, packQuantity: null },
                ],
              },
            ],
            distributionRules: [
              { id: "rule-top-2", priority: 0, ruleType: "TOP_N", rankFrom: null, rankTo: null, topN: 2, topPercent: null, poolAmount: null, bundleId: "bundle-a" },
            ],
          },
        }),
      },
      contestSettlementPlan: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockImplementation(async ({ data }: any) => ({
          id: "sp-policy",
          status: "DRAFT",
          contestId: data.contestId,
          items: data.items.createMany.data.map((item: any, index: number) => ({ id: `ip${index + 1}`, ...item })),
        })),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await generateSettlementPlan("c-policy");

    expect(result.planId).toBe("sp-policy");
    expect(result.matchedUsers).toBe(2);
    expect(result.totals.pointsCreditTotal).toBe(150);
    expect(result.totals.packsGrantTotal).toBe(0);
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
});
