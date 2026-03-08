import { NextResponse } from "next/server";
import { buildXAuthRequest } from "@/lib/x-oauth";

export const dynamic = "force-dynamic";

const X_STATE_COOKIE = "mcg_x_state";
const X_VERIFIER_COOKIE = "mcg_x_verifier";

export async function GET(req: Request) {
  try {
    const { state, codeVerifier, url } = buildXAuthRequest();
    const response = NextResponse.redirect(url);

    const baseCookie = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    };

    response.cookies.set({ name: X_STATE_COOKIE, value: state, ...baseCookie });
    response.cookies.set({ name: X_VERIFIER_COOKIE, value: codeVerifier, ...baseCookie });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/?auth_error=x_oauth_env", req.url));
  }
}
