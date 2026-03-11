import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { QuestRuntimeError, reviewQuestSubmissionMvp } from "@/lib/domain/quests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, { params }: { params: { submissionId: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_MODERATOR, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const body = (await request.json().catch(() => null)) as { action?: "APPROVE" | "REJECT"; note?: string; decisionCode?: string } | null;
    const action = body?.action;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ ok: false, error: "action must be APPROVE or REJECT" }, { status: 400 });
    }

    if (action === "REJECT" && !body?.decisionCode?.trim()) {
      return NextResponse.json({ ok: false, error: "decisionCode is required for REJECT" }, { status: 400 });
    }

    const noteParts = [body?.decisionCode?.trim(), body?.note?.trim()].filter(Boolean);

    const result = await reviewQuestSubmissionMvp({
      submissionId: params.submissionId,
      action,
      reviewedByAdmin: actor.label,
      note: noteParts.length ? noteParts.join(" | ") : undefined,
    });

    await safeLogAdminAction({
      actionType: "MODERATION_DECISION_EXECUTE",
      module: "MODERATION",
      status: "EXECUTED",
      actor: actor,
      targetType: "QUEST_SUBMISSION",
      targetId: params.submissionId,
      requestSummary: { action, decisionCode: body?.decisionCode ?? null },
      effectSummary: { alreadyReviewed: result.alreadyReviewed },
    });

    return NextResponse.json({ ...result, actor: actor });
  } catch (error) {
    if (error instanceof QuestRuntimeError) {
      await safeLogAdminAction({
        actionType: "MODERATION_DECISION_EXECUTE",
        module: "MODERATION",
        status: "FAILED",
        actor: actor,
        targetType: "QUEST_SUBMISSION",
        targetId: params.submissionId,
        errorCode: "MODERATION_DECISION_FAILED",
        errorMessage: error.message,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot review quest submission");
  }
}
