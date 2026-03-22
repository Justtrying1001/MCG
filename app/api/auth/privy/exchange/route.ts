export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildSessionCookieOptions,
  buildSessionHintCookieOptions,
  clearSession,
  createSession,
  getSessionCookieName,
  getSessionHintCookieName,
  getSessionMaxAgeSeconds,
} from "@/lib/auth";
import { INTERNAL_EVENT_TYPES, recordInternalEvent } from "@/lib/analytics/events";
import { readVisitorIdFromRequest } from "@/lib/analytics/visitor-id";
import { IdentityConflictError, upsertUserFromPrivyIdentityGraphWithWelcome } from "@/lib/domain/rewards/onboarding";
import { logAuthEvent } from "@/lib/observability/auth-log";
import { prisma } from "@/lib/prisma";
import { resolvePrivyIdentityFromAccessToken } from "@/lib/privy-auth";

type ExchangeRequestBody = {
  accessToken?: string;
};

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
  const visitorId = readVisitorIdFromRequest(request);

  try {
    const body = (await request.json().catch(() => null)) as ExchangeRequestBody | null;
    const accessToken = body?.accessToken?.trim();

    if (!accessToken) {
      logAuthEvent("privy_exchange_rejected", "warn", {
        reason: "missing_access_token",
        requestHost: url.host,
      });
      return NextResponse.json({ ok: false, error: "Missing access token" }, { status: 400 });
    }

    const identity = await resolvePrivyIdentityFromAccessToken(accessToken);

    let user;

    try {
      user = await prisma.$transaction(async (tx) => {
        const result = await upsertUserFromPrivyIdentityGraphWithWelcome(tx, {
          privyUserId: identity.privyUserId,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
          identities: identity.identities,
        });
        return result.user;
      });
    } catch (error) {
      logPrismaExchangeError("user.upsert", error);
      throw error;
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
      linkedIdentities: identity.identities.map((account) => ({
        provider: account.provider,
        providerUserId: account.providerUserId,
        username: account.username,
        walletAddress: account.walletAddress,
      })),
    });

    response.cookies.set({
      name: getSessionCookieName(),
      value: sessionToken,
      ...buildSessionCookieOptions(getSessionMaxAgeSeconds()),
    });
    response.cookies.set({
      name: getSessionHintCookieName(),
      value: "1",
      ...buildSessionHintCookieOptions(getSessionMaxAgeSeconds()),
    });

    if (visitorId) {
      await recordInternalEvent({
        type: INTERNAL_EVENT_TYPES.login,
        visitorId,
        userId: user.id,
        isGuest: false,
      });
    }

    const linkedTwitter = identity.identities.find((account) => account.provider === "TWITTER") ?? null;

    logAuthEvent("privy_exchange_succeeded", "info", {
      requestHost: url.host,
      userId: user.id,
      privyUserId: identity.privyUserId,
      linkedXUserId: linkedTwitter?.providerUserId ?? null,
      linkedXUsername: linkedTwitter?.username ?? null,
    });

    return response;
  } catch (error) {
    if (error instanceof IdentityConflictError) {
      logAuthEvent("privy_exchange_conflict", "warn", {
        requestHost: url.host,
        errorName: error.name,
        errorMessage: error.message,
        conflictProviders: error.conflictProviders.join(","),
      });
      return NextResponse.json({ ok: false, error: "Identity conflict" }, { status: 409 });
    }

    logAuthEvent("privy_exchange_failed", "error", {
      requestHost: url.host,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "Privy exchange failed" }, { status: 401 });
  }
}
