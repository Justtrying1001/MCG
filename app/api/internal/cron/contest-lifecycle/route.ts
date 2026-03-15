import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { reconcileDueContestsByTime } from "@/lib/domain/contests/lifecycle-reconciliation";

/**
 * Contest lifecycle cron endpoint.
 *
 * Must be triggered externally on a schedule (every minute via Vercel Cron,
 * GitHub Actions, or equivalent). Secured by CRON_SECRET header.
 *
 * Vercel cron config (vercel.json):
 * {
 *   "crons": [{ "path": "/api/internal/cron/contest-lifecycle", "schedule": "* * * * *" }]
 * }
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await reconcileDueContestsByTime();

    const transitions = results.flatMap((result) =>
      result.steps.map((step) => ({
        contestId: result.contestId,
        from: step.from,
        to: step.to,
        reason: step.reason,
      }))
    );

    return NextResponse.json({
      ok: true,
      processed: results.length,
      transitions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lifecycle reconciliation failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
