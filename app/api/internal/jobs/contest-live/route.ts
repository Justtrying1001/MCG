import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";

import { handleApiError } from "@/lib/api-error";
import { reconcileContestLifecycleByTime } from "@/lib/domain/contests/lifecycle-reconciliation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  });

  const signature = request.headers.get("upstash-signature") ?? "";
  const body = await request.text();

  const isValid = await receiver.verify({ signature, body });
  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { contestId } = JSON.parse(body) as { contestId: string };
    const result = await reconcileContestLifecycleByTime(contestId);
    return NextResponse.json({ ok: true, contestId, result });
  } catch (error) {
    return handleApiError(error, "contest-live job failed");
  }
}
