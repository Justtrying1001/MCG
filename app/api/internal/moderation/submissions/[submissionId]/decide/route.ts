import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, requireAdminRole } from "@/lib/admin-ops";
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
    const body = (await request.json().catch(() => null)) as { decision?: "APPROVE" | "REJECT"; decisionCode?: string; note?: string } | null;
    const decision = body?.decision;
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ ok: false, error: "decision must be APPROVE or REJECT" }, { status: 400 });
    }

    if (decision === "REJECT" && !body?.decisionCode?.trim()) {
      return NextResponse.json({ ok: false, error: "decisionCode is required for REJECT" }, { status: 400 });
    }

    const noteParts = [body?.decisionCode?.trim(), body?.note?.trim()].filter(Boolean);

    const result = await reviewQuestSubmissionMvp({
      submissionId: params.submissionId,
      action: decision,
      reviewedByAdmin: actor.label,
      note: noteParts.length ? noteParts.join(" | ") : undefined,
    });

    return NextResponse.json({ ok: true, result, actor: actor });
  } catch (error) {
    if (error instanceof QuestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot decide moderation submission");
  }
}
