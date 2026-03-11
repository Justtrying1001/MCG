import { beforeEach, describe, expect, it, vi } from "vitest";

const { grantWelcomeRewardMock } = vi.hoisted(() => ({
  grantWelcomeRewardMock: vi.fn(),
}));

vi.mock("@/lib/domain/rewards/welcome", () => ({
  grantWelcomeReward: grantWelcomeRewardMock,
}));

import { upsertUserFromXProfileWithWelcome } from "@/lib/domain/rewards/onboarding";

function profile() {
  return {
    id: "x_123",
    username: "alice",
    name: "Alice",
    profile_image_url: "https://avatar",
  };
}

describe("upsertUserFromXProfileWithWelcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("grants welcome reward for a newly created user", async () => {
    const createdUser = { id: "u_new", xUserId: "x_123" };
    const tx = {
      user: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => createdUser),
        update: vi.fn(),
      },
    };

    const result = await upsertUserFromXProfileWithWelcome(tx as any, profile());

    expect(result.created).toBe(true);
    expect(result.user).toBe(createdUser);
    expect(tx.user.create).toHaveBeenCalledOnce();
    expect(grantWelcomeRewardMock).toHaveBeenCalledWith(tx, createdUser.id);
  });

  it("does not grant welcome reward for existing user logins", async () => {
    const updatedUser = { id: "u_existing", xUserId: "x_123" };
    const tx = {
      user: {
        findUnique: vi.fn(async () => ({ id: updatedUser.id })),
        create: vi.fn(),
        update: vi.fn(async () => updatedUser),
      },
    };

    const result = await upsertUserFromXProfileWithWelcome(tx as any, profile());

    expect(result.created).toBe(false);
    expect(result.user).toBe(updatedUser);
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(grantWelcomeRewardMock).not.toHaveBeenCalled();
  });
});
