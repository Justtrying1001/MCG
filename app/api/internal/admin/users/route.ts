import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { listUsersForAdminBrowser } from "@/lib/domain/users/browser";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "25");
    const page = Number(request.nextUrl.searchParams.get("page") ?? "1");

    const payload = await listUsersForAdminBrowser({ query: q, limit, page });

    return NextResponse.json({
      ok: true,
      total: payload.total,
      page: payload.page,
      limit: payload.limit,
      users: payload.users.map((user) => ({
        id: user.id,
        displayName: user.displayName,
        xUsername: user.xUsername,
        points: user.points,
        packsOpened: user.packsOpened,
        createdAt: user.createdAt.toISOString(),
        level: user.userProgression?.level ?? null,
        xp: user.userProgression?.xp ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot list users");
  }
}
