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
    const allProjects = await prisma.tokenProject.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, displayName: true, coingeckoId: true },
      orderBy: { displayName: "asc" },
    });

    // Also check card template metadata for coingeckoId overrides
    const templateMetadataRows = await prisma.cardTemplate.findMany({
      where: { isActive: true, tokenProject: { isActive: true } },
      select: {
        tokenProjectId: true,
        metadata: true,
      },
    });

    // Build a set of tokenProjectIds that have coingeckoId from metadata
    const metadataGeckoIds = new Set<string>();
    for (const row of templateMetadataRows) {
      const geckoId = readCoingeckoFromTemplateMetadata(row.metadata);
      if (geckoId) metadataGeckoIds.add(row.tokenProjectId);
    }

    const withCoingeckoId = allProjects.filter((p) => p.coingeckoId !== null || metadataGeckoIds.has(p.id));
    const withoutCoingeckoId = allProjects.filter((p) => p.coingeckoId === null && !metadataGeckoIds.has(p.id));

    return NextResponse.json({
      ok: true,
      totalTokenProjects: allProjects.length,
      withCoingeckoId: withCoingeckoId.length,
      withoutCoingeckoId: withoutCoingeckoId.length,
      // Coverage rate
      coveragePercent: allProjects.length > 0
        ? Math.round((withCoingeckoId.length / allProjects.length) * 100)
        : 0,
      // Breakdown: which source provides the geckoId
      breakdown: allProjects.map((p) => ({
        id: p.id,
        slug: p.slug,
        displayName: p.displayName,
        coingeckoId: p.coingeckoId,
        hasMetadataOverride: metadataGeckoIds.has(p.id),
        resolved: p.coingeckoId !== null || metadataGeckoIds.has(p.id),
      })),
      // Compact list for quick scanning
      missingList: withoutCoingeckoId.map((p) => ({
        id: p.id,
        slug: p.slug,
        displayName: p.displayName,
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load token coingecko coverage");
  }
}

function readCoingeckoFromTemplateMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const tokenIdentity = (metadata as Record<string, unknown>).tokenIdentity;
  if (!tokenIdentity || typeof tokenIdentity !== "object" || Array.isArray(tokenIdentity)) return null;
  const coingeckoId = (tokenIdentity as Record<string, unknown>).coingeckoId;
  if (typeof coingeckoId !== "string") return null;
  const value = coingeckoId.trim().toLowerCase();
  return value.length > 0 ? value : null;
}
