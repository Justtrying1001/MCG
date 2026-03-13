import { describe, expect, it, vi } from "vitest";

import { MILESTONE_SEED_DEFINITIONS } from "@/lib/domain/quests/milestone-definitions";
import { seedMilestoneQuests } from "@/lib/domain/quests/milestone-seed";

describe("milestone rewards seed", () => {
  it("defines exactly 15 core gameplay milestones", () => {
    expect(MILESTONE_SEED_DEFINITIONS).toHaveLength(15);
    expect(new Set(MILESTONE_SEED_DEFINITIONS.map((x) => x.code)).size).toBe(15);
    expect(new Set(MILESTONE_SEED_DEFINITIONS.map((x) => x.seedKey)).size).toBe(15);
    expect(MILESTONE_SEED_DEFINITIONS.every((x) => x.unique)).toBe(true);
    expect(MILESTONE_SEED_DEFINITIONS.every((x) => x.repeatable === false)).toBe(true);
  });

  it("is idempotent and does not duplicate on reseed", async () => {
    const store = new Map<string, any>();
    const prismaMock = {
      questDefinition: {
        findUnique: vi.fn(async ({ where }: any) => store.get(where.code) ?? null),
        create: vi.fn(async ({ data }: any) => {
          store.set(data.code, { id: data.code, ...data });
          return store.get(data.code);
        }),
      },
    } as any;

    const first = await seedMilestoneQuests(prismaMock);
    const second = await seedMilestoneQuests(prismaMock);

    expect(first.createdCount).toBe(15);
    expect(first.existingCount).toBe(0);
    expect(second.createdCount).toBe(0);
    expect(second.existingCount).toBe(15);
    expect(store.size).toBe(15);
  });
});
