import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";
import { RewardType, PackSource } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(1, Number(limitParam) || 20), 100);

    const grants = await prisma.rewardGrant.findMany({
      where: {
        type: RewardType.PACK,
        packDefinitionId: { not: null },
      },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        claimedAt: true,
        packDefinition: {
          select: { code: true, source: true },
        },
        sourceContestSettlement: {
          select: {
            id: true,
            contest: { select: { title: true } },
          },
        },
        user: {
          select: { displayName: true, xUsername: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });

    const result = grants.map((grant) => {
      const hasContest = Boolean(grant.sourceContestSettlement?.id);
      return {
        id: grant.id,
        userId: grant.userId,
        packCode: grant.packDefinition?.code ?? null,
        sourceType: hasContest ? "CONTEST" as const : "QUEST_OR_MANUAL" as const,
        contestTitle: grant.sourceContestSettlement?.contest.title ?? null,
        createdAt: grant.createdAt.toISOString(),
        claimedAt: grant.claimedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ ok: true, grants: result, fetchedAt: new Date().toISOString() });
  } catch (error) {
    return handleApiError(error, "Cannot load recent pack grants");
  }
}
