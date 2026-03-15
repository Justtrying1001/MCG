import { describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, getPackSupplySummaryMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  getPackSupplySummaryMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({
  requireInternalAdminAccess: requireInternalAdminAccessMock,
}));

vi.mock("@/lib/domain/rewards/pack-supply", () => ({
  getPackSupplySummary: getPackSupplySummaryMock,
}));

import { GET } from "@/app/api/admin/packs/supply/route";

describe("/api/admin/packs/supply", () => {
  it("rejects unauthorized requests", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await GET(new Request("http://localhost/api/admin/packs/supply") as any);

    expect(response.status).toBe(403);
  });

  it("returns canonical supply summary for authorized admin", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true });
    getPackSupplySummaryMock.mockResolvedValue({
      sale: {
        totalSupply: 10000,
        opened: 120,
        remaining: 9880,
        pools: [{ packDefinitionId: "s1", packCode: "sale_pack", displayName: "Sale", totalSupply: 10000, opened: 120, remaining: 9880, isActive: true }],
      },
      reward: {
        totalSupply: 6000,
        attributed: 800,
        claimed: 700,
        reserved: 100,
        remaining: 5200,
        pools: [{ packDefinitionId: "r1", packCode: "reward_pack", displayName: "Reward", totalSupply: 6000, attributed: 800, claimed: 700, reserved: 100, remaining: 5200, isActive: true, poolStatus: "TRACKED" }],
      },
      global: {
        totalSupply: 16000,
        saleOpened: 120,
        rewardAttributed: 800,
        rewardClaimed: 700,
        rewardReserved: 100,
        remaining: 15080,
      },
      lastUpdatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    });

    const response = await GET(new Request("http://localhost/api/admin/packs/supply") as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.sale.totalSupply).toBe(10000);
    expect(payload.reward.attributed).toBe(800);
    expect(payload.global.totalSupply).toBe(16000);
    expect(payload.reward.pools[0].poolStatus).toBe("TRACKED");
  });
});
