import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, requireAdminRole } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { previewSettlementPlan } from "@/lib/domain/contests/settlement-plan-runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest, { params }: { params: { contestId: string; planId: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_FINANCE_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }

  try {
    const result = await previewSettlementPlan(params.planId, params.contestId);
    return NextResponse.json({ ok: true, preview: result });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return handleApiError(error, "Cannot preview settlement plan");
  }
}
