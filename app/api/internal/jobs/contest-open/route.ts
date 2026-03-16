import { NextRequest, NextResponse } from "next/server";
import { ContestStatus } from "@prisma/client";

import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { verifyQStashSignature } from "@/lib/qstash-verify";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("upstash-signature") ?? "";

  const isValid = await verifyQStashSignature(signature, body);
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
