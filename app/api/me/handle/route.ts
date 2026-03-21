export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { logAuthEvent } from "@/lib/observability/auth-log";
import { enforceSameOrigin } from "@/lib/csrf";

const handleSchema = z.object({
  handle: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Handle must use only letters, numbers, or underscores"),
});

export async function POST(request: Request) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  try {
    const url = new URL(request.url);
    const session = await resolveSessionUser();
    if (!session.ok) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = handleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Invalid handle" }, { status: 400 });
    }

    const normalizedHandle = parsed.data.handle.toLowerCase();
    const [existingUser, currentUser] = await Promise.all([
      prisma.user.findFirst({
        where: {
          handle: { equals: normalizedHandle, mode: "insensitive" },
          id: { not: session.user.id },
        },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, displayName: true },
      }),
    ]);

    if (existingUser) {
      return NextResponse.json({ ok: false, error: "Handle already taken" }, { status: 409 });
    }
    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        handle: normalizedHandle,
        displayName: currentUser.displayName === "MCG Player" ? normalizedHandle : undefined,
      },
      select: {
        id: true,
        handle: true,
        displayName: true,
      },
    });

    logAuthEvent("handle_onboarding_completed", "info", {
      requestHost: url.host,
      userId: user.id,
      handle: user.handle,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Handle already taken" }, { status: 409 });
    }
    return handleApiError(error, "Cannot save handle");
  }
}
