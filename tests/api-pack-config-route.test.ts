import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSalePackRuntimeConfigMock } = vi.hoisted(() => ({
  getSalePackRuntimeConfigMock: vi.fn(),
}));

vi.mock("@/lib/domain/acquisition/pack-config", () => ({
  getSalePackRuntimeConfig: getSalePackRuntimeConfigMock,
}));

import { GET } from "@/app/api/pack/config/route";

describe("GET /api/pack/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns runtime config payload", async () => {
    getSalePackRuntimeConfigMock.mockResolvedValue({
      exists: true,
      pack: {
        code: "genesis_sale_pack",
        displayName: "MCG Genesis Sale Pack",
        cardsPerPack: 5,
        plannedPackCount: 10000,
        openedPackCount: 100,
        remainingPackCount: 10900,
        isActive: true,
      },
      slots: [{ index: 4, type: "RARITY_HIT", label: "Hit slot", rarityOdds: [{ rarityCode: "RARE", pct: 30 }] }],
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pack.remainingPackCount).toBe(10900);
    expect(body.slots[0].type).toBe("RARITY_HIT");
  });
});
