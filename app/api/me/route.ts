export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionCookieName, getSessionUserWithStatus } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildUserPayload } from "@/lib/serializers";
import { handleApiError } from "@/lib/api-error";
import { ensurePveDailyState, getNextPveResetAt } from "@/lib/pve/reset";

export async function GET() {
  try {
    const sessionLookup = await getSessionUserWithStatus();

    if (sessionLookup.status === "cookie_missing") {
      console.info("[API_ME_SESSION_COOKIE_MISSING]", {
        cookieName: getSessionCookieName(),
      });
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (sessionLookup.status === "session_not_found") {
      console.info("[API_ME_SESSION_NOT_FOUND]");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (sessionLookup.status === "session_expired") {
      console.info("[API_ME_SESSION_EXPIRED]");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const sessionUser = sessionLookup.user;
    if (!sessionUser) {
      console.error("[API_ME_SESSION_LOOKUP_INCONSISTENT]");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.info("[API_ME_USER_FOUND]", { userId: sessionUser.id });

    const [userCards, openingsCount, pveRunsCount] = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, lastPveResetAt: true },
      });
      if (!user) throw new Error("User not found");

      await ensurePveDailyState(tx, user);

      return Promise.all([
        tx.userCard.findMany({ where: { userId: sessionUser.id } }),
        tx.packOpening.count({ where: { userId: sessionUser.id } }),
        tx.pveRun.count({ where: { userId: sessionUser.id } }),
      ]);
    });

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const payload = buildUserPayload(user, userCards);
    const availablePveCards = payload.collection.filter((c) => !c.pveExhausted).length;
    const exhaustedPveCards = payload.collection.filter((c) => c.pveExhausted).length;

    return NextResponse.json({
      ...payload,
      openingsCount,
      pveRunsCount,
      availablePveCards,
      exhaustedPveCards,
      nextPveResetAt: getNextPveResetAt().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load user profile");
  }
}
