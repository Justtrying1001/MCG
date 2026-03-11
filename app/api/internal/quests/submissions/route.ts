import { QuestSubmissionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { listQuestSubmissionsMvp } from "@/lib/domain/quests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const statusRaw = request.nextUrl.searchParams.get("status");
    const status = statusRaw && Object.values(QuestSubmissionStatus).includes(statusRaw as QuestSubmissionStatus)
      ? statusRaw as QuestSubmissionStatus
      : undefined;

    const submissions = await listQuestSubmissionsMvp({ status });
    return NextResponse.json({ submissions });
  } catch (error) {
    return handleApiError(error, "Cannot load quest submissions");
  }
}
