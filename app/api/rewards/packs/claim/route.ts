import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { INTERNAL_EVENT_TYPES, recordInternalEvent } from "@/lib/analytics/events";
import { handleApiError } from "@/lib/api-error";
import { claimRewardPackGrantDbNative, PackOpenRuntimeError } from "@/lib/domain/acquisition/open-pack";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = (await request.json().catch(() => null)) as { rewardGrantId?: unknown; grantId?: unknown } | null;
    const requestedGrantIdRaw = typeof body?.grantId === "string" ? body.grantId : body?.rewardGrantId;
    const requestedGrantId = typeof requestedGrantIdRaw === "string" ? requestedGrantIdRaw.trim() : "";

    const grant = requestedGrantId
      ? await prisma.rewardGrant.findFirst({
          where: {
            id: requestedGrantId,
            userId: user.id,
            type: "PACK",
            packDefinition: { source: "REWARD" },
          },
          select: { id: true },
        })
      : await prisma.rewardGrant.findFirst({
          where: {
            userId: user.id,
            type: "PACK",
            packDefinition: { source: "REWARD" },
            sourcePackOpeningEventId: null,
            claimedAt: null,
          },
          orderBy: [{ createdAt: "asc" }],
          select: { id: true },
        });

    if (!grant) {
      return new NextResponse("No reward pack claim available", { status: 404 });
    }

    const result = await claimRewardPackGrantDbNative({
      userId: user.id,
      rewardGrantId: grant.id,
    });

    await recordInternalEvent({
      type: INTERNAL_EVENT_TYPES.packOpen,
      userId: user.id,
      isGuest: false,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PackOpenRuntimeError) {
      return new NextResponse(error.message, { status: error.status });
    }

    return handleApiError(error, "Cannot claim reward pack");
  }
}
