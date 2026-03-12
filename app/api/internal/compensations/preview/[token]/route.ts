import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, getAdminArtifact, requireAdminRole } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_FINANCE_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const token = await getAdminArtifact(params.token, "compensation_preview");
    if (!token) {
      return NextResponse.json({ ok: false, error: "Compensation token not found" }, { status: 404 });
    }

    const payload = token.payload as { userId?: string; amount?: number; reasonCode?: string; reasonLabel?: string };
    const user = payload.userId
      ? await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, displayName: true, points: true } })
      : null;

    return NextResponse.json({
      ok: true,
      token: params.token,
      preview: {
        user: {
          id: user?.id ?? payload.userId ?? "",
          displayName: user?.displayName ?? payload.userId ?? "unknown",
          pointsBefore: user?.points ?? 0,
          pointsAfter: (user?.points ?? 0) + Number(payload.amount ?? 0),
        },
        rewardComponents: [{ type: "POINTS", amount: Number(payload.amount ?? 0) }],
        accounting: {
          ledgerCreditsToCreate: 1,
          reasonType: "ADMIN_GRANT",
        },
        requiresSupervisorApproval: Number(payload.amount ?? 0) >= 5000,
        warnings: [],
      },
    });
  } catch (error) {
    return handleApiError(error, "Cannot load compensation preview");
  }
}
