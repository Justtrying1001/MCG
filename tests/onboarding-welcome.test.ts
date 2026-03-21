import { UserIdentityProvider } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { grantWelcomeRewardMock } = vi.hoisted(() => ({
  grantWelcomeRewardMock: vi.fn(),
}));

vi.mock("@/lib/domain/rewards/welcome", () => ({
  grantWelcomeReward: grantWelcomeRewardMock,
}));

import { IdentityConflictError, upsertUserFromPrivyIdentityGraphWithWelcome } from "@/lib/domain/rewards/onboarding";

function identityGraph() {
  return {
    privyUserId: "did:privy:123",
    displayName: "Alice",
    avatarUrl: "https://avatar",
    identities: [
      {
        provider: UserIdentityProvider.PRIVY,
        providerUserId: "did:privy:123",
        username: null,
        displayName: "Alice",
        walletAddress: null,
        isPrimary: true,
      },
      {
        provider: UserIdentityProvider.TWITTER,
        providerUserId: "x_123",
        username: "alice",
        displayName: "alice",
        walletAddress: null,
        isPrimary: false,
      },
    ],
  };
}

describe("upsertUserFromPrivyIdentityGraphWithWelcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants welcome reward for a newly created user", async () => {
    const createdUser = { id: "u_new", handle: "alice", displayName: "Alice", avatarUrl: "https://avatar", points: 0, packsOpened: 0 };
    const tx = {
      userIdentity: {
        findMany: vi.fn(async () => []),
        upsert: vi.fn(async () => undefined),
      },
      user: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => createdUser),
        update: vi.fn(),
      },
    };

    const result = await upsertUserFromPrivyIdentityGraphWithWelcome(tx as any, identityGraph());

    expect(result.created).toBe(true);
    expect(result.user).toBe(createdUser);
    expect(tx.user.create).toHaveBeenCalledOnce();
    expect(tx.userIdentity.upsert).toHaveBeenCalledTimes(2);
    expect(grantWelcomeRewardMock).toHaveBeenCalledWith(tx, createdUser.id);
  });

  it("does not grant welcome reward for existing user logins", async () => {
    const existingIdentity = { id: "ident_1", userId: "u_existing", provider: UserIdentityProvider.PRIVY, providerUserId: "did:privy:123" };
    const updatedUser = { id: "u_existing", handle: "alice", displayName: "Alice", avatarUrl: "https://avatar", points: 0, packsOpened: 0 };
    const tx = {
      userIdentity: {
        findMany: vi.fn(async () => [existingIdentity]),
        upsert: vi.fn(async () => undefined),
      },
      user: {
        findUnique: vi.fn(async () => ({ id: updatedUser.id, handle: "alice", displayName: "Alice" })),
        create: vi.fn(),
        update: vi.fn(async () => updatedUser),
      },
    };

    const result = await upsertUserFromPrivyIdentityGraphWithWelcome(tx as any, identityGraph());

    expect(result.created).toBe(false);
    expect(result.user).toBe(updatedUser);
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(grantWelcomeRewardMock).not.toHaveBeenCalled();
  });

  it("throws on identity conflicts instead of auto-merging users", async () => {
    const tx = {
      userIdentity: {
        findMany: vi.fn(async () => [
          { id: "ident_1", userId: "u1", provider: UserIdentityProvider.PRIVY, providerUserId: "did:privy:123" },
          { id: "ident_2", userId: "u2", provider: UserIdentityProvider.TWITTER, providerUserId: "x_123" },
        ]),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    await expect(upsertUserFromPrivyIdentityGraphWithWelcome(tx as any, identityGraph())).rejects.toBeInstanceOf(IdentityConflictError);
  });
});
