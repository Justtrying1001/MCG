import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { QuestRuntimeError, submitSocialQuestMvp } from "@/lib/domain/quests/runtime";
import { enforceSameOrigin } from "@/lib/csrf";

export async function POST(request: Request, { params }: { params: { questId: string } }) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = (await request.json().catch(() => null)) as { proofUrl?: string; note?: string } | null;

    const submission = await submitSocialQuestMvp({
      questId: params.questId,
      userId: user.id,
      proofUrl: body?.proofUrl,
      note: body?.note,
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    if (error instanceof QuestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot submit quest proof");
  }
}
