import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    packDefinition: { findMany: vi.fn() },
    rewardGrant: { groupBy: vi.fn() },
    rewardPackSupply: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getPackSupplySummary } from "@/lib/domain/rewards/pack-supply";

describe("pack supply runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds canonical sale and reward supply aggregates with per-pack pools", async () => {
    prismaMock.packDefinition.findMany
      .mockResolvedValueOnce([
        { id: "sale_1", code: "sale_pack_a", displayName: "Sale A", plannedPackCount: 1000, openedPackCount: 100, isActive: true },
      ])
      .mockResolvedValueOnce([
        { id: "rw_1", code: "reward_pack_a", displayName: "Reward A", plannedPackCount: 500, isActive: true },
        { id: "rw_2", code: "reward_pack_b", displayName: "Reward B", plannedPackCount: 120, isActive: false },
      ]);

    prismaMock.rewardGrant.groupBy
      .mockResolvedValueOnce([
        { packDefinitionId: "rw_1", _count: { _all: 80 } },
        { packDefinitionId: "rw_2", _count: { _all: 50 } },
      ])
      .mockResolvedValueOnce([
        { packDefinitionId: "rw_1", _count: { _all: 70 } },
        { packDefinitionId: "rw_2", _count: { _all: 25 } },
      ]);

    prismaMock.rewardPackSupply.findMany.mockResolvedValue([
      { id: "reward_pack_a", totalSupply: 500 },
      { id: "reward_pack_b", totalSupply: 120 },
    ]);

    const summary = await getPackSupplySummary();

    expect(summary.sale).toMatchObject({ totalSupply: 1000, opened: 100, remaining: 900 });
    expect(summary.reward).toMatchObject({
      totalSupply: 620,
      attributed: 130,
      claimed: 95,
      reserved: 35,
      remaining: 490,
    });
    expect(summary.reward.pools).toHaveLength(2);
    expect(summary.global).toMatchObject({ totalSupply: 1620, saleOpened: 100, rewardAttributed: 130, remaining: 1390 });
  });

  it("marks reward pools missing tracking rows", async () => {
    prismaMock.packDefinition.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "rw_1", code: "orphan_reward_pack", displayName: "Orphan", plannedPackCount: 40, isActive: true },
      ]);

    prismaMock.rewardGrant.groupBy.mockResolvedValueOnce([{ packDefinitionId: "rw_1", _count: { _all: 10 } }]).mockResolvedValueOnce([]);
    prismaMock.rewardPackSupply.findMany.mockResolvedValue([]);

    const summary = await getPackSupplySummary();

    expect(summary.reward.pools[0]).toMatchObject({
      packCode: "orphan_reward_pack",
      totalSupply: 40,
      attributed: 10,
      poolStatus: "MISSING_POOL",
      remaining: 30,
    });
  });
});
