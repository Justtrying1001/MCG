import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import {
  buildSessionCookieOptions,
  buildSessionHintCookieOptions,
  clearSession,
  getSessionCookieName,
  getSessionHintCookieName,
} from "@/lib/auth";
import { logAuthEvent } from "@/lib/observability/auth-log";
import { enforceSameOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;
  const cookieName = getSessionCookieName();
  const token = cookies().get(cookieName)?.value;

  if (token) {
    await clearSession(token);
  }

  logAuthEvent("logout", "info", {
    hadSessionCookie: Boolean(token),
    cookieName,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: cookieName,
    value: "",
    ...buildSessionCookieOptions(0),
  });
  response.cookies.set({
    name: getSessionHintCookieName(),
    value: "",
    ...buildSessionHintCookieOptions(0),
  });

  return response;
}
