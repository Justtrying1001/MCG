import { ContestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, createAdminArtifact, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { validateContestTransition } from "@/lib/domain/contests/contest-lifecycle-runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const body = (await request.json().catch(() => null)) as { targetPhase?: ContestStatus; reasonCode?: string; note?: string } | null;
    const targetPhase = body?.targetPhase;

    if (!targetPhase || !Object.values(ContestStatus).includes(targetPhase)) {
      return NextResponse.json({ ok: false, error: "targetPhase is invalid" }, { status: 400 });
    }

    const validation = await validateContestTransition(params.contestId, targetPhase, "manual");
    const contest = validation.contest;
    const issues = validation.issues;
    const blocking = validation.blocking;

    const token = await createAdminArtifact({
      artifactType: "contest_transition_validation",
      targetType: "CONTEST",
      targetId: params.contestId,
      payload: { currentPhase: contest.status, targetPhase, reasonCode: body?.reasonCode ?? null, mode: validation.mode },
      createdBy: actor.id,
      ttlSeconds: 60 * 30,
    });

    await safeLogAdminAction({
      actionType: "CONTEST_TRANSITION_VALIDATE",
      module: "CONTESTS",
      status: blocking ? "FAILED" : "VALIDATED",
      actor: actor,
      targetType: "CONTEST",
      targetId: params.contestId,
      requestSummary: {
        from: contest.status,
        to: targetPhase,
        reasonCode: body?.reasonCode ?? null,
      },
      effectSummary: { blocking, issuesCount: issues.length },
      ...(blocking ? { errorCode: issues[0]?.code, errorMessage: issues[0]?.message } : {}),
    });

    return NextResponse.json({
      ok: true,
      currentPhase: contest.status,
      targetPhase,
      blocking,
      issues,
      warnings: issues.filter((issue) => issue.severity === "WARN"),
      actor: actor,
      impactSummary: {
        message: "Phase transition updates contest status",
        entries: contest._count.entries,
        rankingRows: contest._count.rankings,
        sideEffects: validation.sideEffects,
      },
      validationToken: token.id,
    });
  } catch (error) {
    return handleApiError(error, "Cannot validate contest transition");
  }
}
