import { Prisma, UserIdentityProvider } from "@prisma/client";

import { grantWelcomeReward } from "@/lib/domain/rewards/welcome";
import type { ResolvedIdentityAccount } from "@/lib/privy-auth";

export class IdentityConflictError extends Error {
  readonly status = 409;

  constructor(message: string, readonly conflictProviders: UserIdentityProvider[]) {
    super(message);
    this.name = "IdentityConflictError";
  }
}

export class IdentityLinkingError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "IdentityLinkingError";
  }
}

export type PrivyIdentityGraph = {
  privyUserId: string;
  displayName: string | null;
  avatarUrl?: string | null;
  identities: ResolvedIdentityAccount[];
};

function uniqueIdentityAccounts(identities: ResolvedIdentityAccount[]) {
  const seen = new Set<string>();
  return identities.filter((identity) => {
    const key = `${identity.provider}:${identity.providerUserId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveHandle(profile: PrivyIdentityGraph, userHandle?: string | null) {
  const twitterIdentity = profile.identities.find((identity) => identity.provider === UserIdentityProvider.TWITTER);
  return userHandle || twitterIdentity?.username?.trim() || null;
}

function resolveDisplayName(profile: PrivyIdentityGraph, userDisplayName?: string | null) {
  const twitterIdentity = profile.identities.find((identity) => identity.provider === UserIdentityProvider.TWITTER);
  return profile.displayName?.trim() || twitterIdentity?.displayName?.trim() || userDisplayName || "MCG Player";
}

function buildIdentityMetadata(identity: ResolvedIdentityAccount) {
  if (!identity.metadata) return Prisma.JsonNull;
  return identity.metadata as Prisma.InputJsonValue;
}

async function upsertIdentities(
  tx: Prisma.TransactionClient,
  userId: string,
  identities: ResolvedIdentityAccount[],
  existingIdentities: Array<{ id: string; userId: string; provider: UserIdentityProvider; providerUserId: string }>,
) {
  for (const identity of identities) {
    const matchingIdentity = existingIdentities.find(
      (candidate) => candidate.provider === identity.provider && candidate.providerUserId === identity.providerUserId,
    );

    if (matchingIdentity && matchingIdentity.userId !== userId) {
      throw new IdentityConflictError(
        "Resolved identity is already linked to another user",
        [matchingIdentity.provider],
      );
    }

    await tx.userIdentity.upsert({
      where: {
        provider_providerUserId: {
          provider: identity.provider,
          providerUserId: identity.providerUserId,
        },
      },
      update: {
        userId,
        username: identity.username ?? undefined,
        displayName: identity.displayName ?? undefined,
        walletAddress: identity.walletAddress ?? undefined,
        isPrimary: identity.provider === UserIdentityProvider.PRIVY ? true : identity.isPrimary,
        isVerified: true,
        lastSeenAt: new Date(),
        metadata: buildIdentityMetadata(identity),
      },
      create: {
        userId,
        provider: identity.provider,
        providerUserId: identity.providerUserId,
        username: identity.username ?? null,
        displayName: identity.displayName ?? null,
        walletAddress: identity.walletAddress ?? null,
        isPrimary: identity.provider === UserIdentityProvider.PRIVY ? true : identity.isPrimary,
        isVerified: true,
        lastSeenAt: new Date(),
        metadata: buildIdentityMetadata(identity),
      },
    });
  }
}

async function updateUserFromIdentityGraph(
  tx: Prisma.TransactionClient,
  params: { userId: string; profile: PrivyIdentityGraph; currentHandle?: string | null; currentDisplayName?: string | null },
) {
  return tx.user.update({
    where: { id: params.userId },
    data: {
      displayName: resolveDisplayName(params.profile, params.currentDisplayName),
      handle: resolveHandle(params.profile, params.currentHandle),
      avatarUrl: params.profile.avatarUrl ?? undefined,
    },
  });
}

export async function upsertUserFromPrivyIdentityGraphWithWelcome(
  tx: Prisma.TransactionClient,
  profile: PrivyIdentityGraph,
) {
  const identities = uniqueIdentityAccounts(profile.identities);
  if (identities.length === 0) {
    throw new Error("Resolved Privy identity graph has no identities");
  }

  const existingPrivyIdentity = await tx.userIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: UserIdentityProvider.PRIVY,
        providerUserId: profile.privyUserId,
      },
    },
    select: {
      id: true,
      userId: true,
      provider: true,
      providerUserId: true,
    },
  });

  const existingIdentities = await tx.userIdentity.findMany({
    where: {
      OR: identities.map((identity) => ({
        provider: identity.provider,
        providerUserId: identity.providerUserId,
      })),
    },
    select: {
      id: true,
      userId: true,
      provider: true,
      providerUserId: true,
    },
  });

  const matchingUserIds = Array.from(new Set([
    ...(existingPrivyIdentity ? [existingPrivyIdentity.userId] : []),
    ...existingIdentities.map((identity) => identity.userId),
  ]));
  if (matchingUserIds.length > 1) {
    throw new IdentityConflictError(
      "Resolved identities are already linked to multiple users",
      Array.from(new Set([
        ...(existingPrivyIdentity ? [existingPrivyIdentity.provider] : []),
        ...existingIdentities.map((identity) => identity.provider),
      ])),
    );
  }

  const targetUserId = existingPrivyIdentity?.userId ?? matchingUserIds[0] ?? null;
  const existingUser = targetUserId
    ? await tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, displayName: true, handle: true },
      })
    : null;

  const user = existingUser
    ? await tx.user.update({
        where: { id: existingUser.id },
        data: {
          displayName: resolveDisplayName(profile, existingUser.displayName),
          handle: resolveHandle(profile, existingUser.handle),
          avatarUrl: profile.avatarUrl ?? undefined,
        },
      })
    : await tx.user.create({
        data: {
          displayName: resolveDisplayName(profile),
          handle: resolveHandle(profile),
          avatarUrl: profile.avatarUrl ?? null,
          points: 0,
        },
      });

  await upsertIdentities(tx, user.id, identities, existingIdentities);

  if (!existingUser) {
    await grantWelcomeReward(tx, user.id);
  }

  return { user, created: !existingUser };
}

export async function linkPrivyIdentitiesToExistingUser(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    profile: PrivyIdentityGraph;
    allowedProviders: UserIdentityProvider[];
  },
) {
  const identities = uniqueIdentityAccounts(
    params.profile.identities.filter((identity) => params.allowedProviders.includes(identity.provider)),
  );

  if (identities.length === 0) {
    throw new IdentityLinkingError("No linkable identity found on the Privy user");
  }

  const user = await tx.user.findUnique({
    where: { id: params.userId },
    select: { id: true, handle: true, displayName: true },
  });
  if (!user) {
    throw new IdentityLinkingError("Authenticated user no longer exists");
  }

  const privyIdentity = await tx.userIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: UserIdentityProvider.PRIVY,
        providerUserId: params.profile.privyUserId,
      },
    },
    select: { userId: true },
  });

  if (!privyIdentity || privyIdentity.userId !== params.userId) {
    throw new IdentityLinkingError("Privy user is not linked to the active application session");
  }

  const existingIdentities = await tx.userIdentity.findMany({
    where: {
      OR: identities.map((identity) => ({
        provider: identity.provider,
        providerUserId: identity.providerUserId,
      })),
    },
    select: {
      id: true,
      userId: true,
      provider: true,
      providerUserId: true,
    },
  });

  await upsertIdentities(tx, params.userId, identities, existingIdentities);
  await updateUserFromIdentityGraph(tx, {
    userId: params.userId,
    profile: params.profile,
    currentHandle: user.handle,
    currentDisplayName: user.displayName,
  });

  return identities;
}

export async function linkWalletIdentitiesToExistingUser(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    profile: PrivyIdentityGraph;
  },
) {
  return linkPrivyIdentitiesToExistingUser(tx, {
    userId: params.userId,
    profile: params.profile,
    allowedProviders: [UserIdentityProvider.WALLET_SOLANA],
  });
}

export async function linkTwitterIdentityToExistingUser(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    profile: PrivyIdentityGraph;
  },
) {
  return linkPrivyIdentitiesToExistingUser(tx, {
    userId: params.userId,
    profile: params.profile,
    allowedProviders: [UserIdentityProvider.TWITTER],
  });
}
