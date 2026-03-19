import { NextResponse } from "next/server";
import { logAuthEvent } from "@/lib/observability/auth-log";
import { buildXAuthenticateUrl, getXRequestToken } from "@/lib/x-oauth";

export const dynamic = "force-dynamic";

const X_REQUEST_TOKEN_COOKIE = "mcg_x_request_token";
const X_REQUEST_TOKEN_SECRET_COOKIE = "mcg_x_request_token_secret";
const INVITE_CODE_COOKIE = "mcg_invite_code";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const inviteCode = url.searchParams.get("invite") ?? url.searchParams.get("ref") ?? "";
    const { oauthToken, oauthTokenSecret } = await getXRequestToken();
    const redirectUrl = buildXAuthenticateUrl(oauthToken);
    const response = NextResponse.redirect(redirectUrl);

    const baseCookie = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    };

    logAuthEvent("x_start", "info", {
      invitePresent: Boolean(inviteCode.trim()),
      redirectHost: new URL(redirectUrl).host,
      redirectPath: new URL(redirectUrl).pathname,
      callbackUrl: process.env.X_REDIRECT_URI ?? null,
      requestHost: url.host,
    });

    response.cookies.set({ name: X_REQUEST_TOKEN_COOKIE, value: oauthToken, ...baseCookie });
    response.cookies.set({ name: X_REQUEST_TOKEN_SECRET_COOKIE, value: oauthTokenSecret, ...baseCookie });
    if (inviteCode.trim()) {
      response.cookies.set({ name: INVITE_CODE_COOKIE, value: inviteCode.trim().toUpperCase(), ...baseCookie, maxAge: 7 * 24 * 60 * 60 });
    }

    return response;
  } catch (error) {
    logAuthEvent("x_start_failed", "error", {
      requestHost: new URL(req.url).host,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.redirect(new URL("/?auth_error=x_oauth_env", req.url));
  }
}
