import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, prismaMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  prismaMock: {
    contest: { findUnique: vi.fn() },
    contestTokenScore: { findMany: vi.fn() },
    contestEntryScoreBreakdown: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/internal/contest-runs/[contestId]/scoring/detail/route";

describe("/api/internal/contest-runs/:contestId/scoring/detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when unauthorized", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    expect(response.status).toBe(403);
  });

  it("returns token and breakdown scoring details", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    prismaMock.contest.findUnique.mockResolvedValue({ id: "c1" });
    prismaMock.contestTokenScore.findMany.mockResolvedValue([
      {
        id: "ts1",
        tokenProject: { displayName: "Bitcoin", slug: "bitcoin" },
        score: 62,
        priceChange: 0.2,
        marketCapChange: 0.1,
        volumeChange: 0.3,
        rankChange: 0.05,
      },
    ]);
    prismaMock.contestEntryScoreBreakdown.findMany.mockResolvedValue([
      {
        id: "br1",
        baseScore: 62,
        rarityMultiplier: 1.1,
        editionMultiplier: 1.05,
        finalScore: 71.61,
        dataQuality: "COMPLETE",
        tokenProject: { displayName: "Bitcoin", slug: "bitcoin" },
        entry: { id: "e1", userId: "u1", user: { handle: "alice", displayName: "Alice" } },
        cardInstance: { id: "ci1", cardTemplate: { name: "BTC Card", imageUrl: null, rarity: { code: "RARE" }, edition: { code: "BASE" } } },
      },
    ]);

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.tokenScores).toHaveLength(1);
    expect(body.tokenScores[0].tokenProject.slug).toBe("bitcoin");
    expect(body.tokenScores[0].baseScore).toBeGreaterThan(0);
    expect(body.breakdownRows).toHaveLength(1);
    expect(body.breakdownRows[0].entry.userId).toBe("u1");
  });
});
