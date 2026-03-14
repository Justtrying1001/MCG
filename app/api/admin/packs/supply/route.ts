import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { getPackSupplySummary } from "@/lib/domain/rewards/pack-supply";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const summary = await getPackSupplySummary();
    return NextResponse.json(summary);
  } catch (error) {
    return handleApiError(error, "Cannot load pack supply");
  }
}
