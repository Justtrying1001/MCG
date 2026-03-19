export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildSessionCookieOptions,
  clearSession,
  createSession,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
} from "@/lib/auth";
import { upsertUserFromPrivyProfileWithWelcome } from "@/lib/domain/rewards/onboarding";
import { syncContestEntryQuestProgression } from "@/lib/domain/quests/runtime";
import { logAuthEvent } from "@/lib/observability/auth-log";
import { prisma } from "@/lib/prisma";
import { resolvePrivyIdentityFromAccessToken } from "@/lib/privy-auth";

type ExchangeRequestBody = {
  accessToken?: string;
  inviteCode?: string | null;
};

function normalizeInviteCode(inviteCode?: string | null) {
  const normalized = String(inviteCode ?? "").trim().toUpperCase();
  return normalized || null;
}

function logPrismaExchangeError(stage: string, error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logAuthEvent("privy_exchange_prisma_error", "error", {
      stage,
      prismaKind: "known",
      prismaCode: error.code,
      message: error.message,
    });
    return;
  }

  logAuthEvent("privy_exchange_error", "error", {
    stage,
    errorName: error instanceof Error ? error.name : "unknown",
    errorMessage: error instanceof Error ? error.message : "unknown",
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);

  try {
    const body = (await request.json().catch(() => null)) as ExchangeRequestBody | null;
    const accessToken = body?.accessToken?.trim();
    const inviteCode = normalizeInviteCode(body?.inviteCode);

    if (!accessToken) {
      logAuthEvent("privy_exchange_rejected", "warn", {
        reason: "missing_access_token",
        requestHost: url.host,
      });
      return NextResponse.json({ ok: false, error: "Missing access token" }, { status: 400 });
    }

    const identity = await resolvePrivyIdentityFromAccessToken(accessToken);

    let user;
    let invitedByUserId: string | null = null;

    try {
      user = await prisma.$transaction(async (tx) => {
        const result = await upsertUserFromPrivyProfileWithWelcome(tx, {
          privyUserId: identity.privyUserId,
          xUserId: identity.twitterUserId,
          xUsername: identity.twitterUsername,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
        }, inviteCode);
        invitedByUserId = result.invitedByUserId;
        return result.user;
      });
    } catch (error) {
      logPrismaExchangeError("user.upsert", error);
      throw error;
    }

    if (invitedByUserId) {
      await Promise.allSettled([
        syncContestEntryQuestProgression(invitedByUserId),
        syncContestEntryQuestProgression(user.id),
      ]);
    }

    const existingToken = cookies().get(getSessionCookieName())?.value;
    if (existingToken) {
      await clearSession(existingToken);
    }

    const { token: sessionToken } = await createSession(user.id);

    const response = NextResponse.json({
      ok: true,
      userId: user.id,
      privyUserId: identity.privyUserId,
      linkedX: identity.twitterUserId ? {
        id: identity.twitterUserId,
        username: identity.twitterUsername,
      } : null,
    });

    response.cookies.set({
      name: getSessionCookieName(),
      value: sessionToken,
      ...buildSessionCookieOptions(getSessionMaxAgeSeconds()),
    });

    logAuthEvent("privy_exchange_succeeded", "info", {
      requestHost: url.host,
      userId: user.id,
      privyUserId: identity.privyUserId,
      linkedXUserId: identity.twitterUserId,
      linkedXUsername: identity.twitterUsername,
      invitePresent: Boolean(inviteCode),
    });

    return response;
  } catch (error) {
    logAuthEvent("privy_exchange_failed", "error", {
      requestHost: url.host,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "Privy exchange failed" }, { status: 401 });
  }
}
