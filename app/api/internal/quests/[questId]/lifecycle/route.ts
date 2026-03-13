import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { QuestRuntimeError, updateQuestLifecycleMvp } from "@/lib/domain/quests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function PATCH(request: NextRequest, { params }: { params: { questId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json().catch(() => null)) as { action?: string } | null;
    const action = body?.action;
    if (!action || !["DISABLE", "ENABLE", "ARCHIVE", "RESTORE", "DELETE_SOFT"].includes(action)) {
      throw new QuestRuntimeError("Invalid lifecycle action", 400);
    }

    const quest = await updateQuestLifecycleMvp(
      params.questId,
      action as "DISABLE" | "ENABLE" | "ARCHIVE" | "RESTORE" | "DELETE_SOFT",
    );
    return NextResponse.json({ quest });
  } catch (error) {
    if (error instanceof QuestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot update quest lifecycle");
  }
}
