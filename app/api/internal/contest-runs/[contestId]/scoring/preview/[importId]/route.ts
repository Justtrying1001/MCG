import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, getAdminArtifact, requireAdminRole } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { contestId: string; importId: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const artifact = await getAdminArtifact(params.importId, "contest_scoring_import");
    if (!artifact || artifact.targetId !== params.contestId) {
      return NextResponse.json({ ok: false, error: "Scoring import not found" }, { status: 404 });
    }

    const payload = artifact.payload as { rows?: Array<{ userId: string; score: number }> };
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];

    const beforeTop = await prisma.contestRanking.findMany({
      where: { contestId: params.contestId },
      orderBy: [{ rank: "asc" }],
      take: 10,
      select: { userId: true, rank: true, score: true },
    });

    const afterRows = [...rows].sort((a, b) => (b.score - a.score) || a.userId.localeCompare(b.userId));
    const afterTop = afterRows.slice(0, 10).map((row, index) => ({ userId: row.userId, rank: index + 1, score: row.score }));

    const beforeRankMap = new Map(beforeTop.map((row) => [row.userId, row.rank]));
    const rankMovements = afterTop
      .filter((row) => beforeRankMap.has(row.userId) && beforeRankMap.get(row.userId) !== row.rank)
      .map((row) => ({ userId: row.userId, from: beforeRankMap.get(row.userId), to: row.rank }));

    return NextResponse.json({
      ok: true,
      contestId: params.contestId,
      importId: params.importId,
      preview: {
        beforeTop,
        afterTop,
        rankMovements,
        entriesToMarkScored: rows.length,
        warnings: [],
      },
    });
  } catch (error) {
    return handleApiError(error, "Cannot load scoring preview");
  }
}
