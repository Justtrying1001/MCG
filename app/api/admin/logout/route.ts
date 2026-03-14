import { NextResponse } from "next/server";

import { getAdminSessionCookieName } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    // Must match the Secure attribute used when the cookie was set so the browser
    // correctly overwrites and expires it (required by __Host- prefix semantics).
    secure: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}
