import { Prisma } from "@prisma/client";

import { grantWelcomeReward } from "@/lib/domain/rewards/welcome";
import { generateUniqueInviteCodeTx, registerUserInviteTx } from "@/lib/domain/referrals/service";

export type XProfileIdentity = {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string | null;
};

export async function upsertUserFromXProfileWithWelcome(
  tx: Prisma.TransactionClient,
  profile: XProfileIdentity,
  referralInviteCode?: string | null,
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

    return { user, created: false as const, invitedByUserId: null };
  }

  const user = await tx.user.create({
    data: {
      xUserId: profile.id,
      inviteCode: await generateUniqueInviteCodeTx(tx),
      xUsername: profile.username,
      displayName: profile.name,
      avatarUrl: profile.profile_image_url ?? null,
      points: 0,
    },
  });

  const inviteLink = await registerUserInviteTx(tx, {
    inviteCode: referralInviteCode ?? "",
    inviteeUserId: user.id,
  });

  await grantWelcomeReward(tx, user.id);

  return { user, created: true as const, invitedByUserId: inviteLink?.inviterId ?? null };
}
