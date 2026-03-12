import { NextRequest, NextResponse } from "next/server";

import { buildQuestUserPreview, toQuestRuntimePayload, validateQuestBuilderInput } from "@/lib/admin/quest-builder";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => null);
    const validation = validateQuestBuilderInput(body ?? {});

    return NextResponse.json({
      ok: true,
      blocking: validation.blocking,
      issues: validation.issues,
      preview: buildQuestUserPreview(body ?? {}),
      normalizedPayload: validation.blocking ? null : toQuestRuntimePayload(body ?? {}),
    });
  } catch (error) {
    return handleApiError(error, "Cannot validate quest builder payload");
  }
}
