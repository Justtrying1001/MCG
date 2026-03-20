import { NextResponse } from "next/server";
import { AnalyticsEventType } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { recordInternalEvent } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

const EVENT_TYPES = new Set<AnalyticsEventType>(Object.values(AnalyticsEventType));

type EventRequestBody = {
  type?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as EventRequestBody | null;
  const requestedType = typeof body?.type === "string" ? body.type.trim().toUpperCase() : "";

  if (!EVENT_TYPES.has(requestedType as AnalyticsEventType)) {
    return NextResponse.json({ ok: false, error: "Invalid analytics event type" }, { status: 400 });
  }

  const user = await getSessionUser();
  await recordInternalEvent({
    type: requestedType as AnalyticsEventType,
    userId: user?.id ?? null,
    isGuest: !user,
  });

  return NextResponse.json({ ok: true });
}
