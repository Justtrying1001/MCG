import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import {
  getInternalQuestDetailMvp,
  QuestRuntimeError,
  updateQuestDefinitionMvp,
} from "@/lib/domain/quests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest, { params }: { params: { questId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const detail = await getInternalQuestDetailMvp(params.questId);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof QuestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot load quest");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { questId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => null);
    const quest = await updateQuestDefinitionMvp(params.questId, body ?? {});
    return NextResponse.json({ quest });
  } catch (error) {
    if (error instanceof QuestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot update quest");
  }
}
