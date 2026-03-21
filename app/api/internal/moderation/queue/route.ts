import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, requireAdminRole } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_MODERATOR, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }

  try {
    const status = request.nextUrl.searchParams.get("status") ?? "SUBMITTED";
    const questId = request.nextUrl.searchParams.get("questId") ?? undefined;
    const campaign = request.nextUrl.searchParams.get("campaign") ?? undefined;

    const rows = await prisma.questSubmission.findMany({
      where: {
        ...(status === "ALL" ? {} : { status: status as any }),
        ...(questId ? { questId } : {}),
        ...(campaign ? { quest: { code: { startsWith: campaign, mode: "insensitive" } } } : {}),
      },
      include: {
        quest: { select: { id: true, code: true, title: true, rewardPoints: true } },
        user: { select: { id: true, handle: true, displayName: true } },
      },
      orderBy: [{ createdAt: "asc" }],
      take: 200,
    });

    const now = Date.now();
    return NextResponse.json({
      ok: true,
      items: rows.map((row) => {
        const ageHours = Math.max(0, Math.floor((now - row.createdAt.getTime()) / (1000 * 60 * 60)));
        return {
          id: row.id,
          status: row.status,
          ageHours,
          slaLevel: ageHours >= 48 ? "BREACH" : ageHours >= 24 ? "AT_RISK" : "OK",
          quest: row.quest,
          user: row.user,
          evidenceCompleteness: row.proofUrl ? "HAS_URL" : row.note ? "NOTE_ONLY" : "EMPTY",
          createdAt: row.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load moderation queue");
  }
}
