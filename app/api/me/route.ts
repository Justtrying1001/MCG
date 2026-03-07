export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildUserPayload } from "@/lib/serializers";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const [userCards, openingsCount, pveRunsCount] = await Promise.all([
      prisma.userCard.findMany({ where: { userId: user.id } }),
      prisma.packOpening.count({ where: { userId: user.id } }),
      prisma.pveRun.count({ where: { userId: user.id } }),
    ]);

    const payload = buildUserPayload(user, userCards);
    return NextResponse.json({ ...payload, openingsCount, pveRunsCount });
  } catch (error) {
    return handleApiError(error, "Cannot load user profile");
  }
}
