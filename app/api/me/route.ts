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

    const [userCards, openingsCount] = await prisma.$transaction([
      prisma.userCard.findMany({ where: { userId: sessionUser.id } }),
      prisma.packOpening.count({ where: { userId: sessionUser.id } }),
    ]);

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const payload = buildUserPayload(user, userCards);
    const collectionProjection = await buildCollectionProjectionV2(sessionUser.id);

    const progressionSummaries = await buildProgressionSummariesV2(
      sessionUser.id,
      user.points,
      collectionProjection
    );

    const response: UserSessionPayload = {
      ...payload,
      openingsCount,
      coexistence: {
        v2: {
          collectionProjection,
          ...progressionSummaries,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "Cannot load user profile");
  }
}
