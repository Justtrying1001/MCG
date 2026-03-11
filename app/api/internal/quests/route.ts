import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import {
  createQuestDefinitionMvp,
  listInternalQuestsMvp,
  QuestRuntimeError,
} from "@/lib/domain/quests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const quests = await listInternalQuestsMvp();
    return NextResponse.json({ quests });
  } catch (error) {
    return handleApiError(error, "Cannot load internal quests");
  }
}

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => null);
    const quest = await createQuestDefinitionMvp(body ?? {});
    return NextResponse.json({ quest }, { status: 201 });
  } catch (error) {
    if (error instanceof QuestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot create quest");
  }
}
