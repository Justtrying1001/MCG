import { RewardType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, createAdminArtifact, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_FINANCE_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const body = (await request.json().catch(() => null)) as {
      userId?: string;
      amount?: number;
      reasonLabel?: string;
      reasonCode?: string;
      note?: string;
    } | null;

    const userId = body?.userId?.trim() ?? "";
    const amount = Number(body?.amount ?? 0);
    const reasonLabel = body?.reasonLabel?.trim() ?? "";
    const reasonCode = body?.reasonCode?.trim() ?? "";

    const issues: Array<{ code: string; severity: "ERROR" | "WARN"; field: string | null; message: string; operatorHint: string }> = [];
    if (!userId) {
      issues.push({ code: "COMPENSATION_USER_REQUIRED", severity: "ERROR", field: "userId", message: "userId is required", operatorHint: "Select a user" });
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      issues.push({ code: "COMPENSATION_INVALID_AMOUNT", severity: "ERROR", field: "amount", message: "amount must be a positive integer", operatorHint: "Fix amount" });
    }
    if (!reasonLabel) {
      issues.push({ code: "COMPENSATION_REASON_REQUIRED", severity: "ERROR", field: "reasonLabel", message: "reasonLabel is required", operatorHint: "Provide reason label" });
    }
    if (!reasonCode) {
      issues.push({ code: "COMPENSATION_REASON_CODE_REQUIRED", severity: "ERROR", field: "reasonCode", message: "reasonCode is required", operatorHint: "Provide reason code" });
    }

    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, points: true, displayName: true } })
      : null;

    if (userId && !user) {
      issues.push({ code: "USER_NOT_FOUND", severity: "ERROR", field: "userId", message: "User not found", operatorHint: "Search and select an existing user" });
    }

    const blocking = issues.some((issue) => issue.severity === "ERROR");

    const token = await createAdminArtifact({
      artifactType: "compensation_preview",
      targetType: "USER",
      targetId: userId || undefined,
      payload: {
        userId,
        amount,
        reasonLabel,
        reasonCode,
        rewardType: RewardType.POINTS,
      },
      createdBy: actor.id,
      ttlSeconds: 60 * 30,
    });

    await safeLogAdminAction({
      actionType: "COMPENSATION_VALIDATE",
      module: "REWARDS",
      status: blocking ? "FAILED" : "VALIDATED",
      actor: actor,
      targetType: "USER",
      targetId: userId || undefined,
      requestSummary: { userId, amount, reasonCode },
      effectSummary: { blocking, issuesCount: issues.length },
      ...(blocking ? { errorCode: issues[0]?.code, errorMessage: issues[0]?.message } : {}),
    });

    return NextResponse.json({
      ok: true,
      blocking,
      issues,
      warnings: [],
      requiresSupervisorApproval: amount >= 5000,
      validationToken: token.id,
      impactSummary: {
        pointsDelta: Number.isInteger(amount) && amount > 0 ? amount : 0,
        rewardComponents: [{ type: "POINTS", amount: Number.isInteger(amount) && amount > 0 ? amount : 0 }],
      },
    });
  } catch (error) {
    return handleApiError(error, "Cannot validate compensation");
  }
}
