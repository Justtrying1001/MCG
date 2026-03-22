import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  grantRewardPackMvpMock,
  listRecentRewardPackGrantsMvpMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  grantRewardPackMvpMock: vi.fn(),
  listRecentRewardPackGrantsMvpMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/domain/rewards/reward-pack-grants", () => ({
  RewardPackGrantError: class RewardPackGrantError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  grantRewardPackMvp: grantRewardPackMvpMock,
  listRecentRewardPackGrantsMvp: listRecentRewardPackGrantsMvpMock,
}));

import { GET, POST } from "@/app/api/internal/rewards/pack-grant/route";

describe("/api/internal/rewards/pack-grant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when admin auth missing", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await POST(new Request("http://localhost/api/internal/rewards/pack-grant", { method: "POST" }) as any);
    expect(response.status).toBe(403);
  });

  it("creates reward pack grant/open", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    grantRewardPackMvpMock.mockResolvedValue({
      mode: "GRANT_AND_OPEN",
      packCode: "genesis_reward_pack",
      rewardGrantId: "rg_1",
      openingEventId: "evt_1",
      pulledCardsMvp: [{ templateId: "tpl_1" }],
      user: { id: "u1", points: 500 },
    });

    const response = await POST(new Request("http://localhost/api/internal/rewards/pack-grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", deliveryMode: "GRANT_AND_OPEN" }),
    }) as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(grantRewardPackMvpMock).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", deliveryMode: "GRANT_AND_OPEN" }));
    expect(body.mode).toBe("GRANT_AND_OPEN");
    expect(body.pulledCardsMvp).toHaveLength(1);
  });

  it("lists recent reward pack grants", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "key" });
    listRecentRewardPackGrantsMvpMock.mockResolvedValue([
      {
        id: "rg_1",
        userId: "u1",
        user: { id: "u1", displayName: "A", handle: "a" },
        packDefinition: { id: "p1", code: "genesis_reward_pack", displayName: "MCG Genesis Reward Pack", source: "REWARD" },
        sourcePackOpeningEvent: { id: "evt_1", openedAt: new Date("2026-03-01T10:00:00.000Z") },
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
      },
    ]);

    const response = await GET(new Request("http://localhost/api/internal/rewards/pack-grant") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.grants).toHaveLength(1);
    expect(body.grants[0].openingEventId).toBe("evt_1");
  });
});
