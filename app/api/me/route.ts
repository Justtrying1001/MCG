export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildUserPayload } from "@/lib/serializers";
import { handleApiError } from "@/lib/api-error";
import { buildCollectionProjectionV2 } from "@/lib/domain/projections/collection";
import { ensurePveDailyState, getNextPveResetAt } from "@/lib/pve/reset";
import type { UserSessionPayload } from "@/types/session";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return new NextResponse("Unauthorized", { status: 401 });

    const [userCards, openingsCount, pveRunsCount] = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, lastPveResetAt: true },
      });
      if (!user) throw new Error("User not found");

      await ensurePveDailyState(tx, user);

      return Promise.all([
        tx.userCard.findMany({ where: { userId: sessionUser.id } }),
        tx.packOpening.count({ where: { userId: sessionUser.id } }),
        tx.pveRun.count({ where: { userId: sessionUser.id } }),
      ]);
    });

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const payload = buildUserPayload(user, userCards);
    const availablePveCards = payload.collection.filter((c) => !c.pveExhausted).length;
    const exhaustedPveCards = payload.collection.filter((c) => c.pveExhausted).length;

    const collectionProjection = await buildCollectionProjectionV2(sessionUser.id);

    const response: UserSessionPayload = {
      ...payload,
      openingsCount,
      pveRunsCount,
      availablePveCards,
      exhaustedPveCards,
      nextPveResetAt: getNextPveResetAt().toISOString(),
      coexistence: {
        v2: {
          collectionProjection,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "Cannot load user profile");
  }
}
