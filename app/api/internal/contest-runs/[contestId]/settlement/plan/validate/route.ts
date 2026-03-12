import { RewardType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, createAdminArtifact, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

type RewardRow = { userId?: string; type?: RewardType; amount?: number; packDefinitionId?: string };

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const body = (await request.json().catch(() => null)) as { rewards?: RewardRow[] } | null;
    const rewards = Array.isArray(body?.rewards) ? body.rewards : [];

    const contest = await prisma.contest.findUnique({
      where: { id: params.contestId },
      select: { id: true, configPublishedAt: true, rewardPolicy: { select: { id: true, status: true } } },
    });
    if (!contest) {
      return NextResponse.json({ ok: false, error: "Contest not found" }, { status: 404 });
    }

    if (contest.configPublishedAt && contest.rewardPolicy?.status === "PUBLISHED") {
      return NextResponse.json({ ok: false, error: "Manual settlement plan is disabled for policy-based contests. Use settlement-plan/generate." }, { status: 409 });
    }

    const issues: Array<{ code: string; severity: "ERROR" | "WARN"; field: string | null; message: string; operatorHint: string }> = [];
    const normalized: Array<{ userId: string; type: RewardType; amount?: number; packDefinitionId?: string }> = [];
    const seenUsers = new Set<string>();

    rewards.forEach((row, index) => {
      const userId = typeof row.userId === "string" ? row.userId.trim() : "";
      const type = row.type;
      if (!userId) {
        issues.push({ code: "SETTLEMENT_INVALID_ROW", severity: "ERROR", field: `rewards[${index}].userId`, message: "userId is required", operatorHint: "Provide a userId" });
        return;
      }
      if (!type || !Object.values(RewardType).includes(type)) {
        issues.push({ code: "SETTLEMENT_INVALID_ROW", severity: "ERROR", field: `rewards[${index}].type`, message: "type is invalid", operatorHint: "Use POINTS, PACK or CARD_INSTANCE" });
        return;
      }
      if (seenUsers.has(`${userId}:${type}`)) {
        issues.push({ code: "SETTLEMENT_DUPLICATE_USER_ROW", severity: "WARN", field: `rewards[${index}].userId`, message: "Duplicate user/type reward row", operatorHint: "Merge duplicate rows if possible" });
      }
      seenUsers.add(`${userId}:${type}`);

      if (type === RewardType.POINTS) {
        if (!Number.isInteger(row.amount) || Number(row.amount) <= 0) {
          issues.push({ code: "SETTLEMENT_INVALID_POINTS", severity: "ERROR", field: `rewards[${index}].amount`, message: "POINTS rewards require positive integer amount", operatorHint: "Fix amount" });
          return;
        }
      }

      if (type === RewardType.PACK && (!row.packDefinitionId || !row.packDefinitionId.trim())) {
        issues.push({ code: "SETTLEMENT_INVALID_PACKAGE", severity: "ERROR", field: `rewards[${index}].packDefinitionId`, message: "PACK rewards require packDefinitionId", operatorHint: "Provide a packDefinitionId" });
        return;
      }

      normalized.push({
        userId,
        type,
        ...(row.amount !== undefined ? { amount: Number(row.amount) } : {}),
        ...(row.packDefinitionId ? { packDefinitionId: row.packDefinitionId.trim() } : {}),
      });
    });

    const blocking = issues.some((issue) => issue.severity === "ERROR");

    const plan = await createAdminArtifact({
      artifactType: "contest_settlement_plan",
      targetType: "CONTEST",
      targetId: params.contestId,
      payload: { rewards: normalized },
      createdBy: actor.id,
      ttlSeconds: 60 * 60,
    });

    await safeLogAdminAction({
      actionType: "CONTEST_SETTLEMENT_VALIDATE",
      module: "CONTESTS",
      status: blocking ? "FAILED" : "VALIDATED",
      actor: actor,
      targetType: "CONTEST",
      targetId: params.contestId,
      requestSummary: { rewardRows: rewards.length },
      effectSummary: { normalizedRows: normalized.length, blocking, issuesCount: issues.length },
      ...(blocking ? { errorCode: "SETTLEMENT_BLOCKING_ISSUES", errorMessage: "Settlement validation failed" } : {}),
    });

    return NextResponse.json({
      ok: true,
      blocking,
      issues,
      warnings: issues.filter((issue) => issue.severity === "WARN"),
      normalized: {
        rowsAccepted: normalized.length,
        distinctUsers: new Set(normalized.map((row) => row.userId)).size,
        totalPoints: normalized.reduce((sum, row) => sum + (row.type === RewardType.POINTS ? (row.amount ?? 0) : 0), 0),
      },
      planId: plan.id,
    });
  } catch (error) {
    return handleApiError(error, "Cannot validate settlement plan");
  }
}
