import { NextRequest, NextResponse } from "next/server";

import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { forceContestLifecycleNow } from "@/lib/domain/contests/lifecycle-debug";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const result = await forceContestLifecycleNow(params.contestId);
    return NextResponse.json({
      ok: result.error === null,
      contestId: result.contestId,
      statusBefore: result.statusBefore,
      statusAfter: result.statusAfter,
      transitionAttempted: result.transitionAttempted,
      startSnapshotAttempted: result.startSnapshotAttempted,
      success: result.success,
      error: result.error,
      attempts: result.attempts,
      reconcileResult: result.reconcileResult,
      before: result.before,
      after: result.after,
    }, { status: result.error ? 409 : 200 });
  } catch (error) {
    const message = errorMessage(error);
    return NextResponse.json({
      ok: false,
      contestId: params.contestId,
      error: message,
      success: false,
    }, { status: message === "Contest not found" ? 404 : 500 });
  }
}
