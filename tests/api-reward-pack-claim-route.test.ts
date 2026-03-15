import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  claimRewardPackGrantDbNativeMock,
  rewardGrantFindFirstMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  claimRewardPackGrantDbNativeMock: vi.fn(),
  rewardGrantFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { rewardGrant: { findFirst: rewardGrantFindFirstMock } } }));
vi.mock("@/lib/domain/acquisition/open-pack", async () => {
  const actual = await vi.importActual<typeof import("@/lib/domain/acquisition/open-pack")>("@/lib/domain/acquisition/open-pack");
  return {
    ...actual,
    claimRewardPackGrantDbNative: claimRewardPackGrantDbNativeMock,
  };
});

import { POST } from "@/app/api/rewards/packs/claim/route";

describe("POST /api/rewards/packs/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/rewards/packs/claim", { method: "POST" }));
    expect(response.status).toBe(401);
  });

  it("claims oldest pending grant", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    rewardGrantFindFirstMock.mockResolvedValue({ id: "rg_1" });
    claimRewardPackGrantDbNativeMock.mockResolvedValue({
      packCode: "mvp_reward_pack",
      openingEventId: "evt_1",
      rewardGrantId: "rg_1",
      pulledCardsMvp: [{ templateId: "tpl_1" }],
    });

    const response = await POST(new Request("http://localhost/api/rewards/packs/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.rewardGrantId).toBe("rg_1");
    expect(claimRewardPackGrantDbNativeMock).toHaveBeenCalledWith({ userId: "u1", rewardGrantId: "rg_1" });
  });
});
