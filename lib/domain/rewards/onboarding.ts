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
  return twitterIdentity?.username?.trim() || userHandle || null;
}

function resolveDisplayName(profile: PrivyIdentityGraph, userDisplayName?: string | null) {
  const twitterIdentity = profile.identities.find((identity) => identity.provider === UserIdentityProvider.TWITTER);
  return profile.displayName?.trim() || twitterIdentity?.displayName?.trim() || userDisplayName || "MCG Player";
}

function buildIdentityMetadata(identity: ResolvedIdentityAccount) {
  if (!identity.metadata) return Prisma.JsonNull;
  return identity.metadata as Prisma.InputJsonValue;
}

export async function upsertUserFromPrivyIdentityGraphWithWelcome(
  tx: Prisma.TransactionClient,
  profile: PrivyIdentityGraph,
) {
  const identities = uniqueIdentityAccounts(profile.identities);
  if (identities.length === 0) {
    throw new Error("Resolved Privy identity graph has no identities");
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

  const matchingUserIds = Array.from(new Set(existingIdentities.map((identity) => identity.userId)));
  if (matchingUserIds.length > 1) {
    throw new IdentityConflictError(
      "Resolved identities are already linked to multiple users",
      Array.from(new Set(existingIdentities.map((identity) => identity.provider))),
    );
  }

  const targetUserId = matchingUserIds[0] ?? null;
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

  for (const identity of identities) {
    const matchingIdentity = existingIdentities.find(
      (candidate) => candidate.provider === identity.provider && candidate.providerUserId === identity.providerUserId,
    );

    if (matchingIdentity && matchingIdentity.userId !== user.id) {
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
        userId: user.id,
        username: identity.username ?? undefined,
        displayName: identity.displayName ?? undefined,
        walletAddress: identity.walletAddress ?? undefined,
        isPrimary: identity.provider === UserIdentityProvider.PRIVY ? true : identity.isPrimary,
        isVerified: true,
        lastSeenAt: new Date(),
        metadata: buildIdentityMetadata(identity),
      },
      create: {
        userId: user.id,
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

  if (!existingUser) {
    await grantWelcomeReward(tx, user.id);
  }

  return { user, created: !existingUser };
}
