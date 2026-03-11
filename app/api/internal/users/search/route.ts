import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { searchUsersForAdminMvp } from "@/lib/domain/users/search";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");

    const users = await searchUsersForAdminMvp(q, limit);
    return NextResponse.json({
      users: users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot search users");
  }
}
