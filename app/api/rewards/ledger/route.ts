import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const entries = await prisma.rewardLedgerEntry.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        entryType: true,
        amount: true,
        reasonType: true,
        reasonRef: true,
        metadata: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      entries: entries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load reward ledger");
  }
}
