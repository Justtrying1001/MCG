import { UserIdentityProvider } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { grantWelcomeRewardMock } = vi.hoisted(() => ({
  grantWelcomeRewardMock: vi.fn(),
}));

vi.mock("@/lib/domain/rewards/welcome", () => ({
  grantWelcomeReward: grantWelcomeRewardMock,
}));

import {
  IdentityConflictError,
  linkTwitterIdentityToExistingUser,
  upsertUserFromPrivyIdentityGraphWithWelcome,
} from "@/lib/domain/rewards/onboarding";

function identityGraph(options?: { includeTwitter?: boolean }) {
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
      ...(options?.includeTwitter === false
        ? []
        : [{
            provider: UserIdentityProvider.TWITTER,
            providerUserId: "x_123",
            username: "alice",
            displayName: "alice",
            walletAddress: null,
            isPrimary: false,
          }]),
    ],
  };
}

describe("upsertUserFromPrivyIdentityGraphWithWelcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates wallet-first users without requiring a handle", async () => {
    const createdUser = { id: "u_new", handle: null, displayName: "Alice", avatarUrl: "https://avatar", points: 0, packsOpened: 0 };
    const tx = {
      userIdentity: {
        findUnique: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        upsert: vi.fn(async () => undefined),
      },
      user: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => createdUser),
        update: vi.fn(),
      },
    };

    const result = await upsertUserFromPrivyIdentityGraphWithWelcome(tx as any, identityGraph({ includeTwitter: false }));

    expect(result.created).toBe(true);
    expect(result.user).toBe(createdUser);
    expect(tx.user.create).toHaveBeenCalledOnce();
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        handle: "alice",
      }),
    }));
    expect(tx.userIdentity.upsert).toHaveBeenCalledTimes(1);
    expect(grantWelcomeRewardMock).toHaveBeenCalledWith(tx, createdUser.id);
  });

  it("creates x-first users without requiring a wallet or app handle", async () => {
    const createdUser = { id: "u_x", handle: null, displayName: "Alice", avatarUrl: "https://avatar", points: 0, packsOpened: 0 };
    const tx = {
      userIdentity: {
        findUnique: vi.fn(async () => null),
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
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        handle: null,
      }),
    }));
    expect(tx.userIdentity.upsert).toHaveBeenCalledTimes(2);
  });

  it("does not overwrite the app handle from the linked twitter username", async () => {
    const existingIdentity = { id: "ident_1", userId: "u_existing", provider: UserIdentityProvider.PRIVY, providerUserId: "did:privy:123" };
    const updatedUser = { id: "u_existing", handle: "player_one", displayName: "Alice", avatarUrl: "https://avatar", points: 0, packsOpened: 0 };
    const tx = {
      userIdentity: {
        findUnique: vi.fn(async () => existingIdentity),
        findMany: vi.fn(async () => [existingIdentity]),
        upsert: vi.fn(async () => undefined),
      },
      user: {
        findUnique: vi.fn(async () => ({ id: updatedUser.id, handle: "player_one", displayName: "Alice" })),
        create: vi.fn(),
        update: vi.fn(async () => updatedUser),
      },
    };

    const result = await upsertUserFromPrivyIdentityGraphWithWelcome(tx as any, identityGraph());

    expect(result.created).toBe(false);
    expect(result.user).toBe(updatedUser);
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        handle: "player_one",
      }),
    }));
    expect(grantWelcomeRewardMock).not.toHaveBeenCalled();
  });

  it("preserves the chosen app handle when twitter is linked later from profile", async () => {
    const tx = {
      userIdentity: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ userId: "u_existing" })
          .mockResolvedValueOnce({ userId: "u_existing" }),
        findMany: vi.fn(async () => []),
        upsert: vi.fn(async () => undefined),
      },
      user: {
        findUnique: vi.fn(async () => ({ id: "u_existing", handle: "player_one", displayName: "Player One" })),
        update: vi.fn(async () => ({ id: "u_existing", handle: "player_one", displayName: "Alice", avatarUrl: "https://avatar" })),
      },
    };

    const linked = await linkTwitterIdentityToExistingUser(tx as any, {
      userId: "u_existing",
      profile: identityGraph(),
    });

    expect(linked).toHaveLength(1);
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        handle: "player_one",
      }),
    }));
  });

  it("throws on identity conflicts instead of auto-merging users", async () => {
    const tx = {
      userIdentity: {
        findUnique: vi.fn(async () => ({ id: "ident_1", userId: "u1", provider: UserIdentityProvider.PRIVY, providerUserId: "did:privy:123" })),
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
