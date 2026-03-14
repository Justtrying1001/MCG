import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    contest: { findUnique: vi.fn() },
    cardTemplate: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { resolveEligibleTokensForContest } from "@/lib/domain/contests/eligibility-runtime";

describe("contest eligibility runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves ANY eligibility from all active templates and dedupes token projects", async () => {
    prismaMock.contest.findUnique.mockResolvedValue({ id: "c1", rules: [{ eligibilityMode: "ANY", cardSetId: null }] });
    prismaMock.cardTemplate.findMany.mockResolvedValue([
      {
        tokenProjectId: "tp1",
        metadata: { tokenIdentity: { coingeckoId: "dogecoin" } },
        tokenProject: { slug: "dogecoin", coingeckoId: null },
      },
      {
        tokenProjectId: "tp1",
        metadata: { tokenIdentity: { coingeckoId: "dogecoin" } },
        tokenProject: { slug: "dogecoin", coingeckoId: null },
      },
      {
        tokenProjectId: "tp2",
        metadata: { tokenIdentity: { coingeckoId: "pepe" } },
        tokenProject: { slug: "pepe", coingeckoId: "pepe" },
      },
    ]);

    const rows = await resolveEligibleTokensForContest("c1");

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.tokenProjectId === "tp1")?.coingeckoId).toBe("dogecoin");
    expect(rows.find((row) => row.tokenProjectId === "tp2")?.coingeckoId).toBe("pepe");
  });



  it("resolves CARD_SET_ONLY using cardSet filtered templates", async () => {
    prismaMock.contest.findUnique.mockResolvedValue({ id: "c2", rules: [{ eligibilityMode: "CARD_SET_ONLY", cardSetId: "set_1" }] });
    prismaMock.cardTemplate.findMany.mockResolvedValue([
      {
        tokenProjectId: "tp10",
        metadata: { tokenIdentity: { coingeckoId: "bonk" } },
        tokenProject: { slug: "bonk", coingeckoId: null },
      },
    ]);

    const rows = await resolveEligibleTokensForContest("c2");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenProjectId).toBe("tp10");

    const where = prismaMock.cardTemplate.findMany.mock.calls[0][0].where;
    expect(where.cardSetId).toBe("set_1");
  });
  it("requires cardSetId for CARD_SET_ONLY", async () => {
    prismaMock.contest.findUnique.mockResolvedValue({ id: "c1", rules: [{ eligibilityMode: "CARD_SET_ONLY", cardSetId: null }] });

    await expect(resolveEligibleTokensForContest("c1")).rejects.toThrow(/cardSetId is required/i);
  });
});
