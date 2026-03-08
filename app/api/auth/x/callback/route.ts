export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession, getSessionCookieName, getSessionMaxAgeSeconds } from "@/lib/auth";
import { exchangeXCodeForToken, fetchXProfile } from "@/lib/x-oauth";

const X_STATE_COOKIE = "mcg_x_state";
const X_VERIFIER_COOKIE = "mcg_x_verifier";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const providerErrorDescription = url.searchParams.get("error_description");

  const cookieStore = cookies();
  const expectedState = cookieStore.get(X_STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(X_VERIFIER_COOKIE)?.value;

  console.info("[X_OAUTH_CALLBACK_REACHED]", {
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasExpectedStateCookie: Boolean(expectedState),
    hasVerifierCookie: Boolean(codeVerifier),
    hasProviderError: Boolean(providerError),
  });

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
    console.error("[X_OAUTH_PROVIDER_ERROR]", {
      providerError,
      providerErrorDescription,
      authError,
    });

    const fail = NextResponse.redirect(new URL(`/?auth_error=${authError}`, req.url));
    clearCookies(fail);
    return fail;
  }

  if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
    console.error("[X_OAUTH_STATE_INVALID]", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasExpectedStateCookie: Boolean(expectedState),
      hasVerifierCookie: Boolean(codeVerifier),
      stateMatches: Boolean(state && expectedState && state === expectedState),
    });

    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_state", req.url));
    clearCookies(fail);
    return fail;
  }

  let accessToken: string;
  try {
    console.info("[X_OAUTH_TOKEN_EXCHANGE_START]");
    const token = await exchangeXCodeForToken(code, codeVerifier);
    accessToken = token.access_token;
    console.info("[X_OAUTH_TOKEN_EXCHANGE_SUCCESS]", { hasAccessToken: Boolean(accessToken) });
  } catch (error) {
    console.error("[X_OAUTH_TOKEN_EXCHANGE_ERROR]", {
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_failed", req.url));
    clearCookies(fail);
    return fail;
  }

  let profile: Awaited<ReturnType<typeof fetchXProfile>>;
  try {
    console.info("[X_OAUTH_PROFILE_FETCH_START]");
    profile = await fetchXProfile(accessToken);
    console.info("[X_OAUTH_PROFILE_FETCH_SUCCESS]", {
      xUserId: profile.id,
      username: profile.username,
    });
  } catch (error) {
    console.error("[X_OAUTH_PROFILE_FETCH_ERROR]", {
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_failed", req.url));
    clearCookies(fail);
    return fail;
  }

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
    console.info("[X_OAUTH_USER_UPSERT_SUCCESS]", {
      userId: user.id,
      xUserId: profile.id,
    });
  } catch (error) {
    console.error("[X_OAUTH_USER_UPSERT_ERROR]", {
      xUserId: profile.id,
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_failed", req.url));
    clearCookies(fail);
    return fail;
  }

  let sessionToken: string;
  try {
    const session = await createSession(user.id);
    sessionToken = session.token;
    console.info("[X_OAUTH_SESSION_CREATE_SUCCESS]", {
      userId: user.id,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[X_OAUTH_SESSION_CREATE_ERROR]", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = NextResponse.redirect(new URL("/?auth_error=x_oauth_failed", req.url));
    clearCookies(fail);
    return fail;
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

  console.info("[X_OAUTH_SESSION_COOKIE_SET]", {
    cookieName: getSessionCookieName(),
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });

  clearCookies(response);
  return response;
}
