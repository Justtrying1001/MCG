import { Prisma } from "@prisma/client";

import { grantWelcomeReward } from "@/lib/domain/rewards/welcome";

export type XProfileIdentity = {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string | null;
};

export async function upsertUserFromXProfileWithWelcome(
  tx: Prisma.TransactionClient,
  profile: XProfileIdentity
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
