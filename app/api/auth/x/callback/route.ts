export const dynamic = "force-dynamic";

import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  buildSessionCookieOptions,
  createSession,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
  getSessionUser,
} from "@/lib/auth";
import { logAuthEvent } from "@/lib/observability/auth-log";
import { upsertUserFromXProfileWithWelcome } from "@/lib/domain/rewards/onboarding";
import { syncContestEntryQuestProgression } from "@/lib/domain/quests/runtime";
import { exchangeXAccessToken, fetchXProfile } from "@/lib/x-oauth";

function safeTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const X_REQUEST_TOKEN_COOKIE = "mcg_x_request_token";
const X_REQUEST_TOKEN_SECRET_COOKIE = "mcg_x_request_token_secret";
const INVITE_CODE_COOKIE = "mcg_invite_code";

function buildTransientCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function logPrismaCallbackError(stage: string, error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logAuthEvent("x_callback_prisma_error", "error", {
      stage,
      prismaKind: "known",
      prismaCode: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    logAuthEvent("x_callback_prisma_error", "error", {
      stage,
      prismaKind: "unknown",
      message: error.message,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    logAuthEvent("x_callback_prisma_error", "error", {
      stage,
      prismaKind: "initialization",
      message: error.message,
      errorCode: error.errorCode,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    logAuthEvent("x_callback_prisma_error", "error", {
      stage,
      prismaKind: "panic",
      message: error.message,
    });
    return;
  }

  logAuthEvent("x_callback_error", "error", {
    stage,
    errorName: error instanceof Error ? error.name : "unknown",
    errorMessage: error instanceof Error ? error.message : "unknown",
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const oauthToken = url.searchParams.get("oauth_token");
  const oauthVerifier = url.searchParams.get("oauth_verifier");
  const deniedToken = url.searchParams.get("denied");
  const configuredAppOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : null;
  const configuredCallbackOrigin = process.env.X_REDIRECT_URI ? new URL(process.env.X_REDIRECT_URI).origin : null;

  const cookieStore = cookies();
  const expectedRequestToken = cookieStore.get(X_REQUEST_TOKEN_COOKIE)?.value;
  const requestTokenSecret = cookieStore.get(X_REQUEST_TOKEN_SECRET_COOKIE)?.value;
  const inviteCode = cookieStore.get(INVITE_CODE_COOKIE)?.value ?? null;

  const clearCookies = (response: NextResponse) => {
    const expiredCookie = buildTransientCookieOptions(0);
    response.cookies.set({ name: X_REQUEST_TOKEN_COOKIE, value: "", ...expiredCookie });
    response.cookies.set({ name: X_REQUEST_TOKEN_SECRET_COOKIE, value: "", ...expiredCookie });
    response.cookies.set({ name: INVITE_CODE_COOKIE, value: "", ...expiredCookie });
  };

  if (configuredAppOrigin && configuredAppOrigin !== url.origin) {
    logAuthEvent("x_callback_origin_mismatch", "warn", {
      requestOrigin: url.origin,
      configuredAppOrigin,
      configuredCallbackOrigin,
    });
  }

  if (deniedToken) {
    logAuthEvent("x_callback_denied", "warn", {
      requestHost: url.host,
      hasStoredRequestToken: Boolean(expectedRequestToken),
    });
    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_denied", req.url));
    clearCookies(fail);
    return fail;
  }

  if (
    !oauthToken
    || !oauthVerifier
    || !expectedRequestToken
    || !requestTokenSecret
    || !safeTokenCompare(oauthToken, expectedRequestToken)
  ) {
    const existingUser = await getSessionUser();
    if (existingUser) {
      logAuthEvent("x_callback_replay_recovered", "info", {
        requestHost: url.host,
        userId: existingUser.id,
      });
      const ok = NextResponse.redirect(new URL("/", req.url));
      clearCookies(ok);
      return ok;
    }

    logAuthEvent("x_callback_invalid_state", "warn", {
      requestHost: url.host,
      hasOauthToken: Boolean(oauthToken),
      hasOauthVerifier: Boolean(oauthVerifier),
      hasExpectedRequestToken: Boolean(expectedRequestToken),
      hasRequestTokenSecret: Boolean(requestTokenSecret),
    });
    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_state", req.url));
    clearCookies(fail);
    return fail;
  }

  try {
    logAuthEvent("x_callback_started", "info", {
      requestHost: url.host,
      invitePresent: Boolean(inviteCode),
      hasExpectedRequestToken: Boolean(expectedRequestToken),
      hasRequestTokenSecret: Boolean(requestTokenSecret),
    });

    const accessToken = await exchangeXAccessToken(oauthToken, oauthVerifier, requestTokenSecret);
    const profile = await fetchXProfile(accessToken.oauthToken, accessToken.oauthTokenSecret);

    let user;
    let invitedByUserId: string | null = null;
    try {
      user = await prisma.$transaction(async (tx) => {
        const result = await upsertUserFromXProfileWithWelcome(tx, profile, inviteCode);
        invitedByUserId = result.invitedByUserId;
        const { user: upsertedUser } = result;
        return upsertedUser;
      });
    } catch (error) {
      logPrismaCallbackError("user.upsert", error);
      throw error;
    }

    if (invitedByUserId) {
      await Promise.allSettled([
        syncContestEntryQuestProgression(invitedByUserId),
        syncContestEntryQuestProgression(user.id),
      ]);
    }

    let sessionToken: string;
    try {
      ({ token: sessionToken } = await createSession(user.id));
    } catch (error) {
      logPrismaCallbackError("createSession", error);
      throw error;
    }

    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.set({
      name: getSessionCookieName(),
      value: sessionToken,
      ...buildSessionCookieOptions(getSessionMaxAgeSeconds()),
    });

    logAuthEvent("session_created", "info", {
      userId: user.id,
      requestHost: url.host,
      cookieName: getSessionCookieName(),
      cookieSecure: buildSessionCookieOptions().secure,
      cookieMaxAge: getSessionMaxAgeSeconds(),
      responseRedirectHost: new URL("/", req.url).host,
    });

    clearCookies(response);
    return response;
  } catch (error) {
    logAuthEvent("x_callback_failed", "error", {
      requestHost: url.host,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_failed", req.url));
    clearCookies(fail);
    return fail;
  }
}
