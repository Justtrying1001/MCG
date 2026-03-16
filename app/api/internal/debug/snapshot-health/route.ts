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
    // Raw aggregation: per contest + phase, count tokens, count with price, count with gecko id
    const rows = await prisma.$queryRaw<
      Array<{
        code: string;
        status: string;
        phase: string;
        token_count: bigint;
        with_price: bigint;
        with_gecko_id: bigint;
        first_captured_at: Date | null;
      }>
    >`
      SELECT
        c.code,
        c.status,
        s.phase,
        COUNT(*) AS token_count,
        COUNT(s."priceUsd") AS with_price,
        COUNT(NULLIF(s."geckoId", '')) AS with_gecko_id,
        MIN(s."capturedAt") AS first_captured_at
      FROM "ContestTokenSnapshot" s
      JOIN "Contest" c ON c.id = s."contestId"
      GROUP BY c.code, c.status, s.phase
      ORDER BY c.code, s.phase
    `;

    const data = rows.map((row) => ({
      code: row.code,
      status: row.status,
      phase: row.phase,
      tokenCount: Number(row.token_count),
      withPrice: Number(row.with_price),
      withoutPrice: Number(row.token_count) - Number(row.with_price),
      withGeckoId: Number(row.with_gecko_id),
      withoutGeckoId: Number(row.token_count) - Number(row.with_gecko_id),
      firstCapturedAt: row.first_captured_at?.toISOString() ?? null,
    }));

    // Summary: contests with issues (LIVE/SETTLED with missing or zero-price snapshots)
    const issues = data.filter(
      (row) =>
        (row.status === "LIVE" || row.status === "SETTLED") &&
        (row.withPrice === 0 || row.withGeckoId === 0)
    );

    return NextResponse.json({
      ok: true,
      totalRows: data.length,
      issues,
      data,
    });
  } catch (error) {
    return handleApiError(error, "Cannot load snapshot health data");
  }
}
