import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, recordContestScoresMvp } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const result = await recordContestScoresMvp({
      contestId: params.contestId,
      scores: body?.scores,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot record contest scores");
  }
}
