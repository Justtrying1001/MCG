import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { autoScoreContestWithCoinGeckoMvp, ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { force?: boolean };

    const result = await autoScoreContestWithCoinGeckoMvp({
      contestId: params.contestId,
      force: Boolean(body?.force),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot auto-score contest");
  }
}
