import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { credentialsFormatMessage, credentialsSchema } from "@/lib/auth-validation";
import { handleApiError } from "@/lib/api-error";
import {
  createSession,
  getSessionCookieName,
  getSessionMaxAgeSeconds,
  hashPassword,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = credentialsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: credentialsFormatMessage }, { status: 400 });
    }

    const username = parsed.data.username.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return NextResponse.json({ ok: false, error: "Username already used" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(parsed.data.password),
      },
    });

    const { token } = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: getSessionCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionMaxAgeSeconds(),
    });

    return response;
  } catch (error) {
    return handleApiError(error, "Register failed");
  }
}
