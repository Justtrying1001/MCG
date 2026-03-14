import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { reconcileDueContestsByTime } from "@/lib/domain/contests/lifecycle-reconciliation";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const results = await reconcileDueContestsByTime();
    const changed = results.filter((row) => row.steps.length > 0);

    return NextResponse.json({
      ok: true,
      processed: results.length,
      changed: changed.length,
      results,
    });
  } catch (error) {
    return handleApiError(error, "Cannot reconcile contest lifecycle");
  }
}
