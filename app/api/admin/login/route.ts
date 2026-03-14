import { NextResponse } from "next/server";

import {
  createAdminSessionToken,
  getAdminSessionCookieName,
  getAdminSessionMaxAgeSeconds,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
    const username = body?.username?.trim() ?? "";
    const password = body?.password ?? "";

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "Username and password are required" }, { status: 400 });
    }

    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const token = createAdminSessionToken(username);

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: getAdminSessionCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      // __Host- prefix requires Secure=true unconditionally (browser enforces it).
      // Modern browsers allow __Host- cookies on localhost without HTTPS.
      secure: true,
      path: "/",
      maxAge: getAdminSessionMaxAgeSeconds(),
    });

    return response;
  } catch {
    // MED-5: do not reveal whether env vars are missing — generic message only
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }
}
