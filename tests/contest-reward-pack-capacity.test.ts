import { describe, expect, it, vi } from "vitest";

import { evaluateContestRewardPackCapacity } from "@/lib/domain/contests/reward-pack-capacity";

type Row = {
  id: string;
  code: string;
  source: "REWARD" | "SALE";
  plannedPackCount: number;
};

function makeTx(params: {
  packs?: Row[];
  pools?: Array<{ id: string; totalSupply: number }>;
  attributedByPackId?: Record<string, number>;
}) {
  const packs = params.packs ?? [];
  const pools = params.pools ?? [];
  const attributedByPackId = params.attributedByPackId ?? {};

  return {
    packDefinition: {
      findMany: vi.fn(async ({ where }: any) => packs.filter((row) => where.id.in.includes(row.id))),
    },
    rewardPackSupply: {
      findUnique: vi.fn(async ({ where }: any) => pools.find((row) => row.id === where.id) ?? null),
    },
    rewardGrant: {
      count: vi.fn(async ({ where }: any) => attributedByPackId[where.packDefinitionId] ?? 0),
    },
  } as any;
}

function baseContest() {
  return {
    id: "c1",
    rewardPolicy: {
      bundles: [
        {
          id: "b1",
          components: [{ type: "PACK", packDefinitionId: "p1", packQuantity: 2 }],
        },
      ],
      distributionRules: [
        { id: "r1", bundleId: "b1", priority: 1, ruleType: "TOP_N", rankFrom: null, rankTo: null, topN: 3, topPercent: null },
      ],
    },
  } as const;
}

describe("contest reward pack capacity", () => {
  it("returns OK when supply covers required packs", async () => {
    const tx = makeTx({
      packs: [{ id: "p1", code: "genesis_reward_pack", source: "REWARD", plannedPackCount: 6000 }],
      pools: [{ id: "genesis_reward_pack", totalSupply: 6000 }],
      attributedByPackId: { p1: 10 },
    });

    const result = await evaluateContestRewardPackCapacity({ contest: baseContest(), tx });

    expect(result.isPublishable).toBe(true);
    expect(result.verdict).toBe("OK");
    expect(result.rows[0]).toMatchObject({ required: 6, available: 5990, shortfall: 0, verdict: "OK" });
  });

  it("returns INSUFFICIENT_SUPPLY when available is below required", async () => {
    const tx = makeTx({
      packs: [{ id: "p1", code: "genesis_reward_pack", source: "REWARD", plannedPackCount: 6000 }],
      pools: [{ id: "genesis_reward_pack", totalSupply: 50 }],
      attributedByPackId: { p1: 46 },
    });

    const result = await evaluateContestRewardPackCapacity({ contest: baseContest(), tx });

    expect(result.isPublishable).toBe(false);
    expect(result.verdict).toBe("INSUFFICIENT_SUPPLY");
    expect(result.rows[0]).toMatchObject({ required: 6, available: 4, shortfall: 2, verdict: "INSUFFICIENT_SUPPLY" });
  });

  it("supports multi-pack reward policies and flags only insufficient pack", async () => {
    const contest = {
      id: "c1",
      rewardPolicy: {
        bundles: [
          { id: "b1", components: [{ type: "PACK", packDefinitionId: "p1", packQuantity: 1 }] },
          { id: "b2", components: [{ type: "PACK", packDefinitionId: "p2", packQuantity: 2 }] },
        ],
        distributionRules: [
          { id: "r1", bundleId: "b1", priority: 1, ruleType: "TOP_N", rankFrom: null, rankTo: null, topN: 2, topPercent: null },
          { id: "r2", bundleId: "b2", priority: 2, ruleType: "TOP_N", rankFrom: null, rankTo: null, topN: 1, topPercent: null },
        ],
      },
    } as const;

    const tx = makeTx({
      packs: [
        { id: "p1", code: "genesis_reward_pack", source: "REWARD", plannedPackCount: 6000 },
        { id: "p2", code: "alt_reward_pack", source: "REWARD", plannedPackCount: 100 },
      ],
      pools: [
        { id: "genesis_reward_pack", totalSupply: 6000 },
        { id: "alt_reward_pack", totalSupply: 2 },
      ],
      attributedByPackId: { p1: 0, p2: 1 },
    });

    const result = await evaluateContestRewardPackCapacity({ contest, tx });

    expect(result.verdict).toBe("INSUFFICIENT_SUPPLY");
    expect(result.rows.find((row) => row.packDefinitionId === "p1")?.verdict).toBe("OK");
    expect(result.rows.find((row) => row.packDefinitionId === "p2")?.verdict).toBe("INSUFFICIENT_SUPPLY");
  });

  it("flags unknown pack definitions and missing pools", async () => {
    const contest = {
      id: "c1",
      rewardPolicy: {
        bundles: [
          { id: "b1", components: [{ type: "PACK", packDefinitionId: "p_missing", packQuantity: 1 }] },
          { id: "b2", components: [{ type: "PACK", packDefinitionId: "p2", packQuantity: 1 }] },
        ],
        distributionRules: [
          { id: "r1", bundleId: "b1", priority: 1, ruleType: "TOP_N", rankFrom: null, rankTo: null, topN: 1, topPercent: null },
          { id: "r2", bundleId: "b2", priority: 2, ruleType: "TOP_N", rankFrom: null, rankTo: null, topN: 1, topPercent: null },
        ],
      },
    } as const;

    const tx = makeTx({
      packs: [{ id: "p2", code: "alt_reward_pack", source: "REWARD", plannedPackCount: 100 }],
      pools: [],
      attributedByPackId: { p2: 0 },
    });

    const result = await evaluateContestRewardPackCapacity({ contest, tx });

    expect(result.isPublishable).toBe(false);
    expect(result.rows.some((row) => row.verdict === "UNKNOWN_PACK")).toBe(true);
    expect(result.rows.some((row) => row.verdict === "REWARD_POOL_MISSING")).toBe(true);
  });

  it("flags TOP_PERCENT as invalid reward config", async () => {
    const contest = {
      id: "c1",
      rewardPolicy: {
        bundles: [{ id: "b1", components: [{ type: "PACK", packDefinitionId: "p1", packQuantity: 1 }] }],
        distributionRules: [
          { id: "r1", bundleId: "b1", priority: 1, ruleType: "TOP_PERCENT", rankFrom: null, rankTo: null, topN: null, topPercent: 10 },
        ],
      },
    } as const;

    const tx = makeTx({
      packs: [{ id: "p1", code: "genesis_reward_pack", source: "REWARD", plannedPackCount: 6000 }],
      pools: [{ id: "genesis_reward_pack", totalSupply: 6000 }],
    });

    const result = await evaluateContestRewardPackCapacity({ contest, tx });

    expect(result.isPublishable).toBe(false);
    expect(result.verdict).toBe("INVALID_REWARD_CONFIG");
    expect(result.issues[0]?.verdict).toBe("INVALID_REWARD_CONFIG");
  });

  it("ignores non-pack reward contests", async () => {
    const contest = {
      id: "c1",
      rewardPolicy: {
        bundles: [{ id: "b1", components: [{ type: "POINTS", packDefinitionId: null, packQuantity: null }] }],
        distributionRules: [
          { id: "r1", bundleId: "b1", priority: 1, ruleType: "TOP_N", rankFrom: null, rankTo: null, topN: 3, topPercent: null },
        ],
      },
    } as const;

    const result = await evaluateContestRewardPackCapacity({ contest, tx: makeTx({}) });

    expect(result.isPublishable).toBe(true);
    expect(result.verdict).toBe("OK");
    expect(result.rows).toHaveLength(0);
  });
});
