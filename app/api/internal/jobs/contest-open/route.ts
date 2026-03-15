import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";

import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { ContestStatus } from "@prisma/client";

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

    await prisma.contest.updateMany({
      where: { id: contestId, status: ContestStatus.DRAFT, configPublishedAt: { not: null } },
      data: { status: ContestStatus.OPEN },
    });

    return NextResponse.json({ ok: true, contestId });
  } catch (error) {
    return handleApiError(error, "contest-open job failed");
  }
}
