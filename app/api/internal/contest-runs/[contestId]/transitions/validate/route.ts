import { ContestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, createAdminArtifact, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_TRANSITIONS: Record<ContestStatus, ContestStatus[]> = {
  DRAFT: [ContestStatus.OPEN, ContestStatus.CANCELED],
  OPEN: [ContestStatus.LOCKED, ContestStatus.CANCELED],
  LOCKED: [ContestStatus.LIVE, ContestStatus.CANCELED],
  LIVE: [ContestStatus.SETTLED, ContestStatus.CANCELED],
  SETTLED: [],
  CANCELED: [],
};

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

    const contest = await prisma.contest.findUnique({
      where: { id: params.contestId },
      include: { _count: { select: { rankings: true, settlements: true } } },
    });

    if (!contest) {
      return NextResponse.json({ ok: false, error: "Contest not found" }, { status: 404 });
    }

    const issues: Array<{ code: string; severity: "ERROR" | "WARN"; message: string; operatorHint: string }> = [];

    if (!ALLOWED_TRANSITIONS[contest.status].includes(targetPhase)) {
      issues.push({
        code: "CONTEST_TRANSITION_NOT_ALLOWED",
        severity: "ERROR",
        message: `Transition ${contest.status} -> ${targetPhase} is not allowed`,
        operatorHint: "Use the next valid lifecycle phase",
      });
    }

    if (targetPhase === ContestStatus.SETTLED && contest._count.rankings === 0) {
      issues.push({
        code: "CONTEST_TRANSITION_PREREQUISITE_FAILED",
        severity: "ERROR",
        message: "Cannot settle a contest without ranking rows",
        operatorHint: "Run scoring first",
      });
    }

    if (targetPhase === ContestStatus.SETTLED && contest._count.settlements > 0) {
      issues.push({
        code: "CONTEST_ALREADY_SETTLED",
        severity: "ERROR",
        message: "Contest already has a settlement",
        operatorHint: "Do not execute settlement transition again",
      });
    }

    const blocking = issues.some((issue) => issue.severity === "ERROR");

    const token = await createAdminArtifact({
      artifactType: "contest_transition_validation",
      targetType: "CONTEST",
      targetId: params.contestId,
      payload: { currentPhase: contest.status, targetPhase, reasonCode: body?.reasonCode ?? null },
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
      warnings: [],
      actor: actor,
      impactSummary: {
        message: "Phase transition updates contest status",
        rankingRows: contest._count.rankings,
      },
      validationToken: token.id,
    });
  } catch (error) {
    return handleApiError(error, "Cannot validate contest transition");
  }
}
