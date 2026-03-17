import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { findTokenMasterBySlug, toMvpCardViewFromTokenMasterRow } from "@/lib/domain/cards/token-master";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 20);

    const rows = await prisma.ownedCardInstance.findMany({
      orderBy: [{ acquiredAt: "desc" }],
      take: limit,
      select: {
        id: true,
        acquiredAt: true,
        user: { select: { displayName: true, xUsername: true } },
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
    });

    const pulls = rows
      .map((row) => {
        const slug = row.cardTemplate.tokenProject?.slug;
        if (!slug) return null;

        const token = findTokenMasterBySlug(slug);
        if (!token) return null;

        const card = toMvpCardViewFromTokenMasterRow({
          token,
          templateId: row.cardTemplate.id,
          rarityCode: row.cardTemplate.rarity?.code ?? "UNKNOWN",
          editionCode: row.cardTemplate.edition?.code ?? "UNKNOWN",
          plannedSupply: row.cardTemplate.plannedSupply ?? 0,
          issuedSupply: row.cardTemplate.issuedSupply ?? 0,
          instanceCount: 0,
        });

        return {
          id: row.id,
          openedAt: row.acquiredAt.toISOString(),
          playerName: row.user.displayName || row.user.xUsername || "Anonymous",
          card,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return NextResponse.json({ pulls });
  } catch (error) {
    return handleApiError(error, "Cannot load recent pulls");
  }
}
