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

    const [user, ownedInstances, openingsCount] = await prisma.$transaction([
      prisma.user.findUnique({ where: { id: sessionUser.id } }),
      prisma.ownedCardInstance.findMany({
        where: { userId: sessionUser.id },
        include: {
          cardTemplate: {
            select: {
              id: true,
              plannedSupply: true,
              issuedSupply: true,
              rarity: { select: { code: true } },
              edition: { select: { code: true } },
              tokenProject: { select: { slug: true } },
            },
          },
        },
      }),
      prisma.packOpeningEvent.count({ where: { userId: sessionUser.id } }),
    ]);

    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const payload = buildUserPayload({
      user,
      ownedInstances,
    });

    const collectionProjection = await buildCollectionProjectionV2(sessionUser.id);

    const progressionSummaries = await buildProgressionSummariesV2(
      sessionUser.id,
      user.points,
      collectionProjection
    );

    const response: UserSessionPayload = {
      ...payload,
      openingsCount,
      mvpCollection: payload.mvpCollection,
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
