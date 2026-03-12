import { ContestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, claimIdempotencyKey, getAdminArtifact, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, updateContestStatusMvp } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey) {
      return NextResponse.json({ ok: false, error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as { status?: ContestStatus; reasonCode?: string; note?: string; validationToken?: string } | null;
    const status = body?.status as ContestStatus;

    if (!status || !Object.values(ContestStatus).includes(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    const validationToken = body?.validationToken?.trim() ?? "";
    if (!validationToken) {
      return NextResponse.json({ ok: false, error: "validationToken is required. Call transitions/validate first." }, { status: 400 });
    }

    const token = await getAdminArtifact(validationToken, "contest_transition_validation");
    if (!token || token.targetId !== params.contestId) {
      return NextResponse.json({ ok: false, error: "Transition validation token not found or expired" }, { status: 404 });
    }

    if (token.createdBy !== actor.id) {
      return NextResponse.json({ ok: false, error: "validationToken was created by another actor" }, { status: 403 });
    }

    const tokenPayload = token.payload as { targetPhase?: ContestStatus; currentPhase?: ContestStatus };
    if (tokenPayload.targetPhase !== status) {
      return NextResponse.json({ ok: false, error: "validationToken targetPhase does not match requested status" }, { status: 409 });
    }

    const idem = await claimIdempotencyKey({
      idempotencyKey,
      actionType: "CONTEST_TRANSITION_EXECUTE",
      actorId: actor.id,
      targetType: "CONTEST",
      targetId: params.contestId,
    });
    if (!idem.claimed) {
      return NextResponse.json({ ok: false, error: "Duplicate idempotency key", code: "IDEMPOTENCY_REPLAY" }, { status: 409 });
    }

    const contest = await updateContestStatusMvp(params.contestId, status);

    await safeLogAdminAction({
      actionType: "CONTEST_TRANSITION_EXECUTE",
      module: "CONTESTS",
      status: "EXECUTED",
      actor: actor,
      targetType: "CONTEST",
      targetId: params.contestId,
      requestSummary: { targetPhase: status, reasonCode: body?.reasonCode ?? null, validationToken, idempotencyKey },
      effectSummary: { contestStatus: contest.status, previousPhase: tokenPayload.currentPhase ?? null },
    });

    return NextResponse.json({ contest, actor: actor });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      await safeLogAdminAction({
        actionType: "CONTEST_TRANSITION_EXECUTE",
        module: "CONTESTS",
        status: "FAILED",
        actor: actor,
        targetType: "CONTEST",
        targetId: params.contestId,
        errorCode: "CONTEST_TRANSITION_EXECUTE_FAILED",
        errorMessage: error.message,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot update contest status");
  }
}
