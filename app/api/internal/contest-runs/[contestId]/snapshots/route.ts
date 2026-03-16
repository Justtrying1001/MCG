import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const snapshots = await prisma.contestTokenSnapshot.findMany({
      where: { contestId: params.contestId },
      orderBy: [{ phase: "asc" }, { capturedAt: "asc" }],
      select: {
        phase: true,
        geckoId: true,
        priceUsd: true,
        marketCapUsd: true,
        volume24hUsd: true,
        marketCapRank: true,
        capturedAt: true,
        tokenProject: { select: { slug: true, displayName: true, coingeckoId: true } },
      },
    });

    const startRows = snapshots.filter((s) => s.phase === "START");
    const endRows = snapshots.filter((s) => s.phase === "END");

    const toTokenList = (rows: typeof startRows) =>
      rows.map((row) => ({
        geckoId: row.geckoId,
        slug: row.tokenProject.slug,
        displayName: row.tokenProject.displayName,
        hasCoingeckoId: row.tokenProject.coingeckoId !== null || (row.geckoId !== row.tokenProject.slug),
        priceUsd: row.priceUsd ? Number(row.priceUsd) : null,
        marketCapUsd: row.marketCapUsd ? Number(row.marketCapUsd) : null,
        volume24hUsd: row.volume24hUsd ? Number(row.volume24hUsd) : null,
        marketCapRank: row.marketCapRank,
        capturedAt: row.capturedAt.toISOString(),
      }));

    const startList = toTokenList(startRows);
    const endList = toTokenList(endRows);

    const startCapturedWithPrice = startList.filter((t) => t.priceUsd !== null).length;
    const endCapturedWithPrice = endList.filter((t) => t.priceUsd !== null).length;

    return NextResponse.json({
      ok: true,
      contestId: params.contestId,
      hasStartSnapshot: startList.length > 0,
      hasEndSnapshot: endList.length > 0,
      start: {
        tokenCount: startList.length,
        capturedWithPrice: startCapturedWithPrice,
        capturedAt: startRows[0]?.capturedAt?.toISOString() ?? null,
        tokens: startList,
      },
      end: {
        tokenCount: endList.length,
        capturedWithPrice: endCapturedWithPrice,
        capturedAt: endRows[0]?.capturedAt?.toISOString() ?? null,
        tokens: endList,
      },
    });
  } catch (error) {
    return handleApiError(error, "Cannot load contest snapshots");
  }
}
