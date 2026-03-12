import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const quests = await prisma.questDefinition.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        validationMode: true,
        rewardPoints: true,
        isActive: true,
        startAt: true,
        endAt: true,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 300,
    });

    return NextResponse.json({
      ok: true,
      quests: quests.map((quest) => ({
        ...quest,
        startAt: quest.startAt?.toISOString() ?? null,
        endAt: quest.endAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load quest library");
  }
}
