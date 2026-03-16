import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { contestId: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const entry = await prisma.contestEntry.findUnique({
      where: { contestId_userId: { contestId: params.contestId, userId: user.id } },
      select: { id: true },
    });

    if (!entry) {
      return NextResponse.json({ rows: [] });
    }

    const rows = await prisma.contestEntryScoreBreakdown.findMany({
      where: { entryId: entry.id },
      select: {
        id: true,
        baseScore: true,
        rarityMultiplier: true,
        editionMultiplier: true,
        finalScore: true,
        dataQuality: true,
        tokenProject: { select: { displayName: true, slug: true } },
        cardInstance: {
          select: {
            id: true,
            cardTemplate: {
              select: { name: true, imageUrl: true, rarity: { select: { code: true } }, edition: { select: { code: true } } },
            },
          },
        },
      },
      orderBy: { finalScore: "desc" },
    });

    return NextResponse.json({ rows });
  } catch (error) {
    return handleApiError(error, "Cannot load score breakdown");
  }
}
