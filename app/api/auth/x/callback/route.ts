export const dynamic = "force-dynamic";

import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession, getSessionCookieName, getSessionMaxAgeSeconds, getSessionUser } from "@/lib/auth";
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

function logPrismaCallbackError(stage: string, error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`[X OAuth callback] Prisma known error at ${stage}`, {
      code: error.code,
      meta: error.meta,
      message: error.message,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error(`[X OAuth callback] Prisma unknown error at ${stage}`, {
      message: error.message,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error(`[X OAuth callback] Prisma initialization error at ${stage}`, {
      message: error.message,
      errorCode: error.errorCode,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    console.error(`[X OAuth callback] Prisma panic at ${stage}`, {
      message: error.message,
    });
    return;
  }

  console.error(`[X OAuth callback] Non-Prisma error at ${stage}`, error);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const oauthToken = url.searchParams.get("oauth_token");
  const oauthVerifier = url.searchParams.get("oauth_verifier");
  const deniedToken = url.searchParams.get("denied");

  const cookieStore = cookies();
  const expectedRequestToken = cookieStore.get(X_REQUEST_TOKEN_COOKIE)?.value;
  const requestTokenSecret = cookieStore.get(X_REQUEST_TOKEN_SECRET_COOKIE)?.value;
  const inviteCode = cookieStore.get(INVITE_CODE_COOKIE)?.value ?? null;

  const clearCookies = (response: NextResponse) => {
    response.cookies.set({ name: X_REQUEST_TOKEN_COOKIE, value: "", path: "/", maxAge: 0 });
    response.cookies.set({ name: X_REQUEST_TOKEN_SECRET_COOKIE, value: "", path: "/", maxAge: 0 });
    response.cookies.set({ name: INVITE_CODE_COOKIE, value: "", path: "/", maxAge: 0 });
  };

  if (deniedToken) {
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
    // In some browsers the callback can be replayed after a successful login.
    // At that point OAuth request cookies are already cleared, but the session is valid.
    // Avoid surfacing a false "state invalid" error in that case.
    const existingUser = await getSessionUser();
    if (existingUser) {
      const ok = NextResponse.redirect(new URL("/", req.url));
      clearCookies(ok);
      return ok;
    }

    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_state", req.url));
    clearCookies(fail);
    return fail;
  }

  try {
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
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionMaxAgeSeconds(),
    });

    clearCookies(response);
    return response;
  } catch (error) {
    console.error("X OAuth callback failed:", error);
    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_failed", req.url));
    clearCookies(fail);
    return fail;
  }
}
