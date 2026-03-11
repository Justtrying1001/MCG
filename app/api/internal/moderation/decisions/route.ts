import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, requireAdminRole } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

function parseDecisionCode(note: string | null) {
  if (!note) return null;
  const [first] = note.split("|");
  const value = first.trim();
  return value.length > 0 ? value : null;
}

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_MODERATOR, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }

  try {
    const questId = request.nextUrl.searchParams.get("questId") ?? undefined;
    const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
    const campaign = request.nextUrl.searchParams.get("campaign") ?? undefined;

    const rows = await prisma.questSubmission.findMany({
      where: {
        reviewedAt: { not: null },
        ...(questId ? { questId } : {}),
        ...(userId ? { userId } : {}),
        ...(campaign ? { quest: { code: { startsWith: campaign, mode: "insensitive" } } } : {}),
      },
      include: {
        quest: { select: { id: true, code: true, title: true } },
        user: { select: { id: true, xUsername: true, displayName: true } },
      },
      orderBy: [{ reviewedAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({
      ok: true,
      items: rows.map((row) => ({
        id: row.id,
        status: row.status,
        decisionCode: parseDecisionCode(row.note),
        note: row.note,
        reviewer: row.reviewedByAdmin,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        quest: row.quest,
        user: row.user,
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load moderation decisions");
  }
}
