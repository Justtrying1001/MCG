import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { finalizeContestFromEndSnapshotTrigger } from "@/lib/domain/contests/finalization-runtime";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  const actor = roleCheck.actor;

  try {
    const result = await finalizeContestFromEndSnapshotTrigger(params.contestId);
    await safeLogAdminAction({
      actionType: "CONTEST_SNAPSHOT_END_CAPTURE",
      module: "CONTESTS",
      status: "EXECUTED",
      actor,
      targetType: "CONTEST",
      targetId: params.contestId,
      effectSummary: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return handleApiError(error, "Cannot capture END snapshot");
  }
}
