export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildUserPayload } from "@/lib/serializers";
import { handleApiError } from "@/lib/api-error";
import { buildCollectionProjectionV2 } from "@/lib/domain/projections/collection";
import { buildProgressionSummariesV2 } from "@/lib/domain/progression/profile-summary";
import { logAuthEvent } from "@/lib/observability/auth-log";
import type { UserSessionPayload } from "@/types/session";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      logAuthEvent("me_unauthorized", "info", { reason: "missing_or_invalid_session" });
      return new NextResponse("Unauthorized", { status: 401 });
    }

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

    if (!user) {
      logAuthEvent("me_unauthorized", "warn", {
        reason: "session_user_missing",
        sessionUserId: sessionUser.id,
      });
      return new NextResponse("Unauthorized", { status: 401 });
    }

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

    logAuthEvent("me_loaded", "info", {
      userId: sessionUser.id,
      openingsCount,
      ownedInstancesCount: ownedInstances.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientKnownRequestError) {
      logAuthEvent("me_db_error", "error", {
        errorName: error.name,
        errorMessage: error.message,
        prismaCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error.errorCode,
      });
    } else {
      logAuthEvent("me_failed", "error", {
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage: error instanceof Error ? error.message : "unknown",
      });
    }
    return handleApiError(error, "Cannot load user profile");
  }
}
