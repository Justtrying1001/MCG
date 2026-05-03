import { describe, expect, it, vi } from "vitest";

import { MILESTONE_SEED_DEFINITIONS } from "@/lib/domain/quests/milestone-definitions";
import { seedMilestoneQuests } from "@/lib/domain/quests/milestone-seed";

describe("milestone rewards seed", () => {
  it("defines unique core gameplay milestones", () => {
    expect(MILESTONE_SEED_DEFINITIONS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(MILESTONE_SEED_DEFINITIONS.map((x) => x.code)).size).toBe(MILESTONE_SEED_DEFINITIONS.length);
    expect(new Set(MILESTONE_SEED_DEFINITIONS.map((x) => x.seedKey)).size).toBe(MILESTONE_SEED_DEFINITIONS.length);
    expect(MILESTONE_SEED_DEFINITIONS.every((x) => x.unique)).toBe(true);
    expect(MILESTONE_SEED_DEFINITIONS.every((x) => x.repeatable === false)).toBe(true);
  });

  it("is idempotent and does not duplicate on reseed", async () => {
    const store = new Map<string, any>();
    const packDefinitions = [{ id: "pack_1", code: "genesis_reward_pack" }];
    const prismaMock = {
      questDefinition: {
        findUnique: vi.fn(async ({ where }: any) => store.get(where.code) ?? null),
        create: vi.fn(async ({ data }: any) => {
          store.set(data.code, { id: data.code, ...data });
          return store.get(data.code);
        }),
      },
      packDefinition: {
        findMany: vi.fn(async () => packDefinitions),
      },
    } as any;

    const first = await seedMilestoneQuests(prismaMock);
    const second = await seedMilestoneQuests(prismaMock);

    expect(first.createdCount).toBe(MILESTONE_SEED_DEFINITIONS.length);
    expect(first.existingCount).toBe(0);
    expect(second.createdCount).toBe(0);
    expect(second.existingCount).toBe(MILESTONE_SEED_DEFINITIONS.length);
    expect(store.size).toBe(MILESTONE_SEED_DEFINITIONS.length);
  });
});
