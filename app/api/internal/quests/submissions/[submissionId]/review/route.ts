import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { QuestRuntimeError, reviewQuestSubmissionMvp } from "@/lib/domain/quests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, { params }: { params: { submissionId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json().catch(() => null)) as { action?: "APPROVE" | "REJECT"; note?: string } | null;
    const action = body?.action;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ ok: false, error: "action must be APPROVE or REJECT" }, { status: 400 });
    }

    const result = await reviewQuestSubmissionMvp({
      submissionId: params.submissionId,
      action,
      reviewedByAdmin: auth.mode,
      note: body?.note,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof QuestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot review quest submission");
  }
}
