import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { contestId: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const settlement = await prisma.contestSettlement.findUnique({
      where: { contestId: params.contestId },
      select: { id: true },
    });

    if (!settlement) {
      return NextResponse.json({ pointsTotal: 0, xpTotal: 0, packsTotal: 0, grants: [] });
    }

    const grants = await prisma.rewardGrant.findMany({
      where: { userId: user.id, sourceContestSettlementId: settlement.id },
      select: { id: true, type: true, amount: true, packDefinitionId: true },
      orderBy: { createdAt: "asc" },
    });

    const pointsTotal = grants.filter((g) => g.type === "POINTS").reduce((sum, g) => sum + (g.amount ?? 0), 0);
    const xpTotal = grants.filter((g) => g.type === "XP").reduce((sum, g) => sum + (g.amount ?? 0), 0);
    const packsTotal = grants.filter((g) => g.type === "PACK").reduce((sum, g) => sum + (g.amount ?? 0), 0);

    return NextResponse.json({ pointsTotal, xpTotal, packsTotal, grants });
  } catch (error) {
    return handleApiError(error, "Cannot load contest rewards");
  }
}
