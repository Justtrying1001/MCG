import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { getAdminAnalytics, type AnalyticsRange } from "@/lib/analytics/events";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

const VALID_RANGES = new Set<AnalyticsRange>(["today", "7d", "all"]);

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const requestedRange = request.nextUrl.searchParams.get("range") ?? "today";
    const range = VALID_RANGES.has(requestedRange as AnalyticsRange) ? requestedRange as AnalyticsRange : "today";
    const analytics = await getAdminAnalytics(range);
    return NextResponse.json({ ok: true, analytics });
  } catch (error) {
    return handleApiError(error, "Cannot load analytics");
  }
}
