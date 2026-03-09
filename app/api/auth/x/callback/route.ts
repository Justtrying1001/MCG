export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession, getSessionCookieName, getSessionMaxAgeSeconds } from "@/lib/auth";
import { exchangeXCodeForToken, fetchXProfile } from "@/lib/x-oauth";

const X_STATE_COOKIE = "mcg_x_state";
const X_VERIFIER_COOKIE = "mcg_x_verifier";

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
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const providerErrorDescription = url.searchParams.get("error_description");

  const cookieStore = cookies();
  const expectedState = cookieStore.get(X_STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(X_VERIFIER_COOKIE)?.value;

  const clearCookies = (response: NextResponse) => {
    response.cookies.set({ name: X_STATE_COOKIE, value: "", path: "/", maxAge: 0 });
    response.cookies.set({ name: X_VERIFIER_COOKIE, value: "", path: "/", maxAge: 0 });
  };

  if (providerError) {
    const deniedErrors = new Set(["access_denied", "authorization_denied", "user_denied"]);
    const deniedByCode = deniedErrors.has(providerError);
    const deniedByDescription = (providerErrorDescription ?? "").toLowerCase().includes("denied")
      || (providerErrorDescription ?? "").toLowerCase().includes("cancel");

    const authError = deniedByCode || deniedByDescription ? "x_oauth_denied" : "x_oauth_failed";
    const fail = NextResponse.redirect(new URL(`/?auth_error=${authError}`, req.url));
    clearCookies(fail);
    return fail;
  }

  if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_state", req.url));
    clearCookies(fail);
    return fail;
  }

  try {
    const token = await exchangeXCodeForToken(code, codeVerifier);
    const profile = await fetchXProfile(token.access_token);

    let user;
    try {
      user = await prisma.user.upsert({
        where: { xUserId: profile.id },
        update: {
          xUsername: profile.username,
          displayName: profile.name,
          avatarUrl: profile.profile_image_url ?? null,
        },
        create: {
          xUserId: profile.id,
          xUsername: profile.username,
          displayName: profile.name,
          avatarUrl: profile.profile_image_url ?? null,
        },
      });
    } catch (error) {
      logPrismaCallbackError("user.upsert", error);
      throw error;
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
