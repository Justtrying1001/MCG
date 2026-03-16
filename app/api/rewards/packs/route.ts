import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const grants = await prisma.rewardGrant.findMany({
      where: {
        userId: user.id,
        type: "PACK",
        claimedAt: null,
        sourcePackOpeningEventId: null,
        packDefinition: { source: "REWARD" },
      },
      select: {
        id: true,
        createdAt: true,
        sourceContestSettlementId: true,
        sourcePackOpeningEventId: true,
        packDefinition: {
          select: { id: true, displayName: true, code: true },
        },
        sourceContestSettlement: {
          select: {
            contest: {
              select: {
                title: true,
              },
            },
          },
        },
        sourcePackOpeningEvent: {
          select: {
            packDefinition: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    return NextResponse.json({ grants });
  } catch (error) {
    return handleApiError(error, "Cannot load reward pack grants");
  }
}
