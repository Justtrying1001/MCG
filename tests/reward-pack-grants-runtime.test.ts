import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, grantRewardPackMvpDbNativeMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
    rewardGrant: {
      findMany: vi.fn(),
    },
  },
  grantRewardPackMvpDbNativeMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/acquisition/open-pack", async () => {
  const actual = await vi.importActual<typeof import("@/lib/domain/acquisition/open-pack")>("@/lib/domain/acquisition/open-pack");
  return {
    ...actual,
    grantRewardPackMvpDbNative: grantRewardPackMvpDbNativeMock,
  };
});

import { grantRewardPackMvp, RewardPackGrantError } from "@/lib/domain/rewards/reward-pack-grants";

describe("reward pack grants runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants and opens reward pack", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: "u1", points: 100, displayName: "U", xUsername: "u" })
      .mockResolvedValueOnce({ id: "u1", points: 100, displayName: "U", xUsername: "u" });

    grantRewardPackMvpDbNativeMock.mockResolvedValue({
      mode: "GRANT_AND_OPEN",
      packCode: "genesis_reward_pack",
      pulledCardsMvp: [{ templateId: "tpl_1" }],
      rewardGrantId: "rg_1",
      openingEventId: "evt_1",
    });

    const result = await grantRewardPackMvp({ userId: "u1", deliveryMode: "GRANT_AND_OPEN" });

    expect(result.mode).toBe("GRANT_AND_OPEN");
    expect(result.pulledCardsMvp).toHaveLength(1);
    expect(grantRewardPackMvpDbNativeMock).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", deliveryMode: "GRANT_AND_OPEN" }));
  });

  it("fails on missing user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(grantRewardPackMvp({ userId: "u_missing" })).rejects.toBeInstanceOf(RewardPackGrantError);
  });
});
