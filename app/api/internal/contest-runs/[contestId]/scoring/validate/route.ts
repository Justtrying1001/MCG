import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, createAdminArtifact, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

type ScoreRow = { rowId?: string; userId?: string; score?: number };

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const body = (await request.json().catch(() => null)) as { rows?: ScoreRow[]; options?: { dedupePolicy?: "LAST_WINS" | "ERROR_ON_DUPLICATE" } } | null;
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "rows must be a non-empty array" }, { status: 400 });
    }

    const contest = await prisma.contest.findUnique({ where: { id: params.contestId } });
    if (!contest) {
      return NextResponse.json({ ok: false, error: "Contest not found" }, { status: 404 });
    }

    const enteredUsers = await prisma.contestEntry.findMany({
      where: { contestId: params.contestId },
      select: { userId: true },
    });
    const enteredSet = new Set(enteredUsers.map((row) => row.userId));

    const issues: Array<{ code: string; severity: "ERROR" | "WARN"; scope: "ROW" | "CONTEST"; rowIndex: number | null; field: string | null; message: string; operatorHint: string }> = [];
    const dedupeMap = new Map<string, number>();
    const dedupePolicy = body?.options?.dedupePolicy ?? "LAST_WINS";

    rows.forEach((row, index) => {
      const userId = typeof row.userId === "string" ? row.userId.trim() : "";
      if (!userId) {
        issues.push({
          code: "SCORING_INVALID_ROW",
          severity: "ERROR",
          scope: "ROW",
          rowIndex: index,
          field: `rows[${index}].userId`,
          message: "userId is required",
          operatorHint: "Fill userId",
        });
        return;
      }

      if (typeof row.score !== "number" || !Number.isFinite(row.score)) {
        issues.push({
          code: "SCORING_INVALID_ROW",
          severity: "ERROR",
          scope: "ROW",
          rowIndex: index,
          field: `rows[${index}].score`,
          message: "score must be a finite number",
          operatorHint: "Fix score value",
        });
        return;
      }

      if (!enteredSet.has(userId)) {
        issues.push({
          code: "SCORING_USER_NOT_ENTERED",
          severity: "ERROR",
          scope: "ROW",
          rowIndex: index,
          field: `rows[${index}].userId`,
          message: "User is not entered in this contest",
          operatorHint: "Remove row or use a valid entered user",
        });
      }

      if (dedupeMap.has(userId) && dedupePolicy === "ERROR_ON_DUPLICATE") {
        issues.push({
          code: "SCORING_DUPLICATE_USER",
          severity: "ERROR",
          scope: "ROW",
          rowIndex: index,
          field: `rows[${index}].userId`,
          message: "Duplicate userId row",
          operatorHint: "Keep one row per user",
        });
      }

      dedupeMap.set(userId, row.score);
    });

    const scoredUsers = new Set(dedupeMap.keys());
    const missingCount = [...enteredSet].filter((userId) => !scoredUsers.has(userId)).length;
    if (missingCount > 0) {
      issues.push({
        code: "SCORING_MISSING_ENTERED_USER",
        severity: "WARN",
        scope: "CONTEST",
        rowIndex: null,
        field: null,
        message: `${missingCount} entered users have no score row`,
        operatorHint: "Confirm partial scoring is expected",
      });
    }

    const blocking = issues.some((issue) => issue.severity === "ERROR");
    const normalizedRows = [...dedupeMap.entries()].map(([userId, score]) => ({ userId, score }));

    const artifact = await createAdminArtifact({
      artifactType: "contest_scoring_import",
      targetType: "CONTEST",
      targetId: params.contestId,
      payload: { rows: normalizedRows },
      createdBy: actor.id,
      ttlSeconds: 60 * 60,
    });

    await safeLogAdminAction({
      actionType: "CONTEST_SCORING_VALIDATE",
      module: "CONTESTS",
      status: blocking ? "FAILED" : "VALIDATED",
      actor: actor,
      targetType: "CONTEST",
      targetId: params.contestId,
      requestSummary: { rows: rows.length, dedupePolicy },
      effectSummary: { normalizedRows: normalizedRows.length, issuesCount: issues.length, blocking },
      ...(blocking ? { errorCode: "SCORING_BLOCKING_ISSUES", errorMessage: "Scoring validation failed" } : {}),
    });

    return NextResponse.json({
      ok: true,
      blocking,
      issues,
      warnings: issues.filter((issue) => issue.severity === "WARN"),
      normalized: {
        rowCountInput: rows.length,
        rowCountAccepted: normalizedRows.length,
        deduped: normalizedRows.length !== rows.length,
      },
      importId: artifact.id,
      actor: actor,
    });
  } catch (error) {
    return handleApiError(error, "Cannot validate contest scoring payload");
  }
}
