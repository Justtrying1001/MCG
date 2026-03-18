import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { reconcileContestLifecycleByTime } from "@/lib/domain/contests/lifecycle-reconciliation";
import { verifyQStashSignature } from "@/lib/qstash-verify";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("upstash-signature") ?? "";

  const isValid = await verifyQStashSignature(signature, body);
  console.info(`[jobs] contest-open received validSignature=${isValid}`);
  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { contestId } = JSON.parse(body) as { contestId: string };
    console.info(`[jobs] contest-open executing contestId=${contestId}`);
    const result = await reconcileContestLifecycleByTime(contestId);
    console.info(`[jobs] contest-open finished contestId=${contestId} finalStatus=${result?.finalStatus ?? "unknown"}`);
    return NextResponse.json({ ok: true, contestId, result });
  } catch (error) {
    return handleApiError(error, "contest-open job failed");
  }
}
