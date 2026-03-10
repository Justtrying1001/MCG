import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { clearSession, getSessionCookieName } from "@/lib/auth";

export async function POST() {
  const cookieName = getSessionCookieName();
  const token = cookies().get(cookieName)?.value;

  if (token) {
    await clearSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: cookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
