export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildSessionCookieOptions,
  buildSessionHintCookieOptions,
  clearSession,
  createSession,
  getSessionCookieName,
  getSessionHintCookieName,
  getSessionMaxAgeSeconds,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMememonDemoUserDefaults, isMememonDemoModeEnabled } from "@/lib/demo-mode";

export async function POST() {
  if (!isMememonDemoModeEnabled()) {
    return NextResponse.json({ ok: false, error: "Demo mode is disabled" }, { status: 403 });
  }

  const defaults = getMememonDemoUserDefaults();

  const user = await prisma.user.upsert({
    where: { handle: defaults.handle },
    create: {
      displayName: defaults.displayName,
      handle: defaults.handle,
      points: defaults.points,
    },
    update: {
      displayName: defaults.displayName,
      points: { set: Math.max(defaults.points, 1000) },
    },
  });

  const existingToken = cookies().get(getSessionCookieName())?.value;
  if (existingToken) await clearSession(existingToken);

  const { token } = await createSession(user.id);

  const response = NextResponse.json({ ok: true, userId: user.id, mode: "demo" });
  response.cookies.set({
    name: getSessionCookieName(),
    value: token,
    ...buildSessionCookieOptions(getSessionMaxAgeSeconds()),
  });
  response.cookies.set({
    name: getSessionHintCookieName(),
    value: "1",
    ...buildSessionHintCookieOptions(getSessionMaxAgeSeconds()),
  });
  return response;
}
