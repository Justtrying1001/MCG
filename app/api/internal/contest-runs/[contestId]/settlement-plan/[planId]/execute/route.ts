import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, claimIdempotencyKey, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { executeSettlementPlan } from "@/lib/domain/contests/settlement-plan-runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, { params }: { params: { contestId: string; planId: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_FINANCE_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey) {
      return NextResponse.json({ ok: false, error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const idem = await claimIdempotencyKey({
      idempotencyKey,
      actionType: "CONTEST_SETTLEMENT_PLAN_EXECUTE",
      actorId: actor.id,
      targetType: "CONTEST",
      targetId: params.contestId,
    });
    if (!idem.claimed) {
      return NextResponse.json({ ok: false, error: "Duplicate idempotency key", code: "IDEMPOTENCY_REPLAY" }, { status: 409 });
    }

    const result = await executeSettlementPlan(params.planId);
    if (result.contestId !== params.contestId) {
      return NextResponse.json({ ok: false, error: "Plan does not belong to this contest" }, { status: 404 });
    }

    await safeLogAdminAction({
      actionType: "CONTEST_SETTLEMENT_PLAN_EXECUTE",
      module: "CONTESTS",
      status: "EXECUTED",
      actor,
      targetType: "CONTEST",
      targetId: params.contestId,
      requestSummary: { planId: params.planId, idempotencyKey },
      effectSummary: result,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      await safeLogAdminAction({
        actionType: "CONTEST_SETTLEMENT_PLAN_EXECUTE",
        module: "CONTESTS",
        status: "FAILED",
        actor,
        targetType: "CONTEST",
        targetId: params.contestId,
        errorCode: "CONTEST_SETTLEMENT_PLAN_EXECUTE_FAILED",
        errorMessage: error.message,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot execute settlement plan");
  }
}
