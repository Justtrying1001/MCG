import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { getContestLifecycleDebugInfo } from "@/lib/domain/contests/lifecycle-debug";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const debug = await getContestLifecycleDebugInfo(params.contestId);
    if (!debug) {
      return NextResponse.json({ ok: false, error: "Contest not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, debug });
  } catch (error) {
    return handleApiError(error, "Cannot load contest lifecycle debug");
  }
}
