import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, claimIdempotencyKey, getAdminArtifact, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, settleContestMvp } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
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

    const body = (await request.json().catch(() => null)) as { planId?: string; rewards?: Array<{ userId: string; type: "POINTS" | "PACK" | "CARD_INSTANCE"; amount?: number; packDefinitionId?: string }> } | null;
    const planId = body?.planId?.trim() ?? "";
    if (!planId) {
      return NextResponse.json({ ok: false, error: "planId is required. Call settlement/plan/validate first." }, { status: 400 });
    }

    const artifact = await getAdminArtifact(planId, "contest_settlement_plan");
    if (!artifact || artifact.targetId !== params.contestId) {
      return NextResponse.json({ ok: false, error: "Settlement plan not found or expired" }, { status: 404 });
    }

    if (artifact.createdBy !== actor.id) {
      return NextResponse.json({ ok: false, error: "planId was created by another actor" }, { status: 403 });
    }

    const payload = artifact.payload as { rewards?: Array<{ userId: string; type: "POINTS" | "PACK" | "CARD_INSTANCE"; amount?: number; packDefinitionId?: string }> };
    const rewards = Array.isArray(payload?.rewards) ? payload.rewards : [];
    if (rewards.length === 0) {
      return NextResponse.json({ ok: false, error: "Settlement plan has no executable reward rows" }, { status: 409 });
    }

    const idem = await claimIdempotencyKey({
      idempotencyKey,
      actionType: "CONTEST_SETTLEMENT_EXECUTE",
      actorId: actor.id,
      targetType: "CONTEST",
      targetId: params.contestId,
    });
    if (!idem.claimed) {
      return NextResponse.json({ ok: false, error: "Duplicate idempotency key", code: "IDEMPOTENCY_REPLAY" }, { status: 409 });
    }

    const result = await settleContestMvp({
      contestId: params.contestId,
      rewards,
    });

    await safeLogAdminAction({
      actionType: "CONTEST_SETTLEMENT_EXECUTE",
      module: "CONTESTS",
      status: "EXECUTED",
      actor: actor,
      targetType: "CONTEST",
      targetId: params.contestId,
      requestSummary: { planId, rewardRows: rewards.length, idempotencyKey },
      effectSummary: { settlementId: result.settlementId, rewardCount: result.rewardCount },
    });

    return NextResponse.json({ ...result, actor: actor });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      await safeLogAdminAction({
        actionType: "CONTEST_SETTLEMENT_EXECUTE",
        module: "CONTESTS",
        status: "FAILED",
        actor: actor,
        targetType: "CONTEST",
        targetId: params.contestId,
        errorCode: "CONTEST_SETTLEMENT_EXECUTE_FAILED",
        errorMessage: error.message,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot settle contest");
  }
}
