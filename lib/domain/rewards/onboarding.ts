import { Prisma } from "@prisma/client";

import { grantWelcomeReward } from "@/lib/domain/rewards/welcome";

export type XProfileIdentity = {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string | null;
};

export type PrivyProfileIdentity = {
  privyUserId: string;
  xUserId: string | null;
  xUsername: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
};

export async function upsertUserFromXProfileWithWelcome(
  tx: Prisma.TransactionClient,
  profile: XProfileIdentity,
) {
  const existing = await tx.user.findUnique({
    where: { xUserId: profile.id },
    select: { id: true },
  });

  if (existing) {
    const user = await tx.user.update({
      where: { xUserId: profile.id },
      data: {
        xUsername: profile.username,
        displayName: profile.name,
        avatarUrl: profile.profile_image_url ?? null,
      },
    });

    return { user, created: false as const };
  }

  const user = await tx.user.create({
    data: {
      xUserId: profile.id,
      xUsername: profile.username,
      displayName: profile.name,
      avatarUrl: profile.profile_image_url ?? null,
      points: 0,
    },
  });

  await grantWelcomeReward(tx, user.id);

  return { user, created: true as const };
}

function buildFallbackXIdentity(privyUserId: string) {
  const suffix = privyUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-12).toLowerCase() || "user";
  return {
    xUserId: `privy:${privyUserId}`,
    xUsername: `privy_${suffix}`,
  };
}

export async function upsertUserFromPrivyProfileWithWelcome(
  tx: Prisma.TransactionClient,
  profile: PrivyProfileIdentity,
) {
  const fallbackIdentity = buildFallbackXIdentity(profile.privyUserId);
  const resolvedXUserId = profile.xUserId ?? fallbackIdentity.xUserId;
  const resolvedXUsername = profile.xUsername ?? fallbackIdentity.xUsername;
  const resolvedDisplayName = profile.displayName ?? profile.xUsername ?? "MCG Player";
  const resolvedAvatarUrl = profile.avatarUrl ?? null;

  const existingPrivyUser = await tx.user.findUnique({
    where: { privyUserId: profile.privyUserId },
    select: { id: true, xUserId: true },
  });

  if (existingPrivyUser) {
    const canPromoteStoredXIdentity = Boolean(
      profile.xUserId
      && existingPrivyUser.xUserId.startsWith("privy:")
      && existingPrivyUser.xUserId !== profile.xUserId,
    );
    const conflictingHistoricalXUser = canPromoteStoredXIdentity
      ? await tx.user.findUnique({
          where: { xUserId: profile.xUserId! },
          select: { id: true },
        })
      : null;

    const user = await tx.user.update({
      where: { id: existingPrivyUser.id },
      data: {
        authProvider: "privy",
        xUserId: canPromoteStoredXIdentity && !conflictingHistoricalXUser ? resolvedXUserId : undefined,
        xUsername: resolvedXUsername,
        displayName: resolvedDisplayName,
        avatarUrl: resolvedAvatarUrl,
      },
    });

    return { user, created: false as const };
  }

  if (profile.xUserId) {
    const existingXUser = await tx.user.findUnique({
      where: { xUserId: profile.xUserId },
      select: { id: true },
    });

    if (existingXUser) {
      const user = await tx.user.update({
        where: { id: existingXUser.id },
        data: {
          privyUserId: profile.privyUserId,
          authProvider: "privy",
          xUsername: resolvedXUsername,
          displayName: resolvedDisplayName,
          avatarUrl: resolvedAvatarUrl,
        },
      });

      return { user, created: false as const };
    }
  }

  const user = await tx.user.create({
    data: {
      privyUserId: profile.privyUserId,
      xUserId: resolvedXUserId,
      xUsername: resolvedXUsername,
      displayName: resolvedDisplayName,
      avatarUrl: resolvedAvatarUrl,
      authProvider: "privy",
      points: 0,
    },
  });

  await grantWelcomeReward(tx, user.id);

  return { user, created: true as const };
}
