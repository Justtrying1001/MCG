import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, claimIdempotencyKey, getAdminArtifact, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, recordContestScoresMvp } from "@/lib/domain/contests/runtime";
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

    const body = (await request.json().catch(() => null)) as { importId?: string; scores?: Array<{ userId: string; score: number }> } | null;
    const importId = body?.importId?.trim() ?? "";
    if (!importId) {
      return NextResponse.json({ ok: false, error: "importId is required. Call scoring/validate first." }, { status: 400 });
    }

    const artifact = await getAdminArtifact(importId, "contest_scoring_import");
    if (!artifact || artifact.targetId !== params.contestId) {
      return NextResponse.json({ ok: false, error: "Scoring import not found or expired" }, { status: 404 });
    }

    if (artifact.createdBy !== actor.id) {
      return NextResponse.json({ ok: false, error: "importId was created by another actor" }, { status: 403 });
    }

    const payload = artifact.payload as { rows?: Array<{ userId: string; score: number }> };
    const scores = Array.isArray(payload?.rows) ? payload.rows : [];
    if (scores.length === 0) {
      return NextResponse.json({ ok: false, error: "Scoring import has no executable rows" }, { status: 409 });
    }

    const idem = await claimIdempotencyKey({
      idempotencyKey,
      actionType: "CONTEST_SCORING_EXECUTE",
      actorId: actor.id,
      targetType: "CONTEST",
      targetId: params.contestId,
    });
    if (!idem.claimed) {
      return NextResponse.json({ ok: false, error: "Duplicate idempotency key", code: "IDEMPOTENCY_REPLAY" }, { status: 409 });
    }

    const result = await recordContestScoresMvp({
      contestId: params.contestId,
      scores,
    });

    await safeLogAdminAction({
      actionType: "CONTEST_SCORING_EXECUTE",
      module: "CONTESTS",
      status: "EXECUTED",
      actor: actor,
      targetType: "CONTEST",
      targetId: params.contestId,
      requestSummary: { importId, rowCount: scores.length, idempotencyKey },
      effectSummary: { rankingsCount: result.rankingsCount },
    });

    return NextResponse.json({ ...result, actor: actor });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      await safeLogAdminAction({
        actionType: "CONTEST_SCORING_EXECUTE",
        module: "CONTESTS",
        status: "FAILED",
        actor: actor,
        targetType: "CONTEST",
        targetId: params.contestId,
        errorCode: "CONTEST_SCORING_EXECUTE_FAILED",
        errorMessage: error.message,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot record contest scores");
  }
}
