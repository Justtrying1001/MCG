import { RewardType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { grantRewardPackMvpDbNative, PackOpenRuntimeError, type RewardPackDeliveryMode } from "@/lib/domain/acquisition/open-pack";

export class RewardPackGrantError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RewardPackGrantError";
    this.status = status;
  }
}

export async function grantRewardPackMvp(input: {
  userId?: unknown;
  deliveryMode?: unknown;
}) {
  const userId = String(input.userId ?? "").trim();
  if (!userId) {
    throw new RewardPackGrantError("userId is required", 400);
  }

  const deliveryModeRaw = String(input.deliveryMode ?? "GRANT_AND_OPEN").trim().toUpperCase();
  if (deliveryModeRaw !== "GRANT_ONLY" && deliveryModeRaw !== "GRANT_AND_OPEN") {
    throw new RewardPackGrantError("deliveryMode must be GRANT_ONLY or GRANT_AND_OPEN", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, points: true, displayName: true, handle: true },
  });

  if (!user) {
    throw new RewardPackGrantError("User not found", 404);
  }

  try {
    const result = await grantRewardPackMvpDbNative({
      userId,
      deliveryMode: deliveryModeRaw as RewardPackDeliveryMode,
    });

    const refreshedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, points: true, displayName: true, handle: true },
    });

    return {
      ...result,
      user: refreshedUser,
    };
  } catch (error) {
    if (error instanceof PackOpenRuntimeError) {
      throw new RewardPackGrantError(error.message, error.status);
    }
    throw error;
  }
}

export async function listRecentRewardPackGrantsMvp(limit = 100) {
  const take = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 300) : 100;

  return prisma.rewardGrant.findMany({
    where: {
      type: RewardType.PACK,
      packDefinition: {
        code: "genesis_reward_pack",
      },
    },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      claimedAt: true,
      user: {
        select: {
          id: true,
          displayName: true,
          handle: true,
        },
      },
      packDefinition: {
        select: {
          id: true,
          code: true,
          displayName: true,
          source: true,
        },
      },
      sourcePackOpeningEvent: {
        select: {
          id: true,
          openedAt: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take,
  });
}
