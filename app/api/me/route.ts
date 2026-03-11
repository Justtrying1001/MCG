export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildUserPayload } from "@/lib/serializers";
import { handleApiError } from "@/lib/api-error";
import { buildCollectionProjectionV2 } from "@/lib/domain/projections/collection";
import { buildProgressionSummariesV2 } from "@/lib/domain/progression/profile-summary";
import type { UserSessionPayload } from "@/types/session";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return new NextResponse("Unauthorized", { status: 401 });

    const [user, ownedInstances, openingsCountV2] = await prisma.$transaction([
      prisma.user.findUnique({ where: { id: sessionUser.id } }),
      prisma.ownedCardInstance.findMany({
        where: { userId: sessionUser.id },
        include: {
          cardTemplate: {
            select: {
              id: true,
              metadata: true,
              plannedSupply: true,
              issuedSupply: true,
              rarity: { select: { code: true } },
              edition: { select: { code: true } },
            },
          },
        },
      }),
      prisma.packOpeningEvent.count({ where: { userId: sessionUser.id } }),
    ]);

    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    // Legacy reads are now lazy fallback only (Phase F):
    // only used for historical users that still have zero instance-aware collection.
    const legacyUserCards =
      ownedInstances.length === 0
        ? await prisma.userCard.findMany({ where: { userId: sessionUser.id } })
        : undefined;

    const openingsCountLegacy =
      openingsCountV2 === 0
        ? await prisma.packOpening.count({ where: { userId: sessionUser.id } })
        : 0;

    const payload = buildUserPayload({
      user,
      ownedInstances,
      legacyUserCards,
    });

    const collectionProjection = await buildCollectionProjectionV2(sessionUser.id);

    const progressionSummaries = await buildProgressionSummariesV2(
      sessionUser.id,
      user.points,
      collectionProjection
    );

    const response: UserSessionPayload = {
      ...payload,
      openingsCount: openingsCountV2 || openingsCountLegacy,
      coexistence: {
        v2: {
          collectionProjection,
          mvpCollection: payload.mvpCollection,
          ...progressionSummaries,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "Cannot load user profile");
  }
}
