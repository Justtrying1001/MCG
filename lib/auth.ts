import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "mcg_session";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function shouldUseSecureCookies() {
  return process.env.NODE_ENV === "production";
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionMaxAgeSeconds() {
  return Math.floor(SESSION_TTL_MS / 1000);
}

export function buildSessionCookieOptions(maxAge = getSessionMaxAgeSeconds()) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge,
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.userSession.create({
    data: {
      userId,
      sessionTokenHash: tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function clearSession(token: string) {
  await prisma.userSession
    .deleteMany({ where: { sessionTokenHash: hashToken(token) } })
    .catch(() => null);
}

export async function getSessionUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = new Date();

  const session = await prisma.userSession.findUnique({
    where: { sessionTokenHash: tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt <= now) {
    await prisma.userSession.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  return session.user;
}
