import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { buildCanonicalCardViewOrThrow } from "@/lib/domain/cards/canonical-card-builder";

export const dynamic = "force-dynamic";

function assertRecentPullTemplateFields(row: {
  id: string;
  cardTemplate: {
    id: string;
    plannedSupply: number | null;
    issuedSupply: number | null;
    rarity: { code: string } | null;
    edition: { code: string } | null;
    tokenProject: { slug: string } | null;
  };
}) {
  const missing: string[] = [];
  if (!row.cardTemplate.tokenProject?.slug) missing.push("tokenProject.slug");
  if (!row.cardTemplate.rarity?.code) missing.push("rarity.code");
  if (!row.cardTemplate.edition?.code) missing.push("edition.code");
  if (!Number.isFinite(row.cardTemplate.plannedSupply)) missing.push("plannedSupply");
  if (!Number.isFinite(row.cardTemplate.issuedSupply)) missing.push("issuedSupply");

  if (missing.length > 0) {
    throw new Error(`[recent-pulls] invalid card template for instance=${row.id}, template=${row.cardTemplate.id}: ${missing.join(", ")}`);
  }
}

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
        user: { select: { displayName: true, handle: true } },
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

    const pulls = rows.map((row) => {
      assertRecentPullTemplateFields(row);

      const card = buildCanonicalCardViewOrThrow({
        source: "recent-pulls-api",
        tokenSlug: row.cardTemplate.tokenProject!.slug,
        templateId: row.cardTemplate.id,
        rarityCode: row.cardTemplate.rarity!.code,
        editionCode: row.cardTemplate.edition!.code,
        plannedSupply: row.cardTemplate.plannedSupply!,
        issuedSupply: row.cardTemplate.issuedSupply!,
        instanceCount: 0,
      });

      return {
        id: row.id,
        openedAt: row.acquiredAt.toISOString(),
        playerName: row.user.displayName || row.user.handle || "Anonymous",
        card,
      };
    });

    return NextResponse.json({ pulls });
  } catch (error) {
    return handleApiError(error, "Cannot load recent pulls");
  }
}
