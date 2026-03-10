import { NextRequest } from "next/server";

import { getAdminSessionFromRequest } from "@/lib/admin-auth";

export function requireInternalAdmin(request: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.INTERNAL_ADMIN_KEY;
  if (!expected) {
    return { ok: false, status: 503, error: "INTERNAL_ADMIN_KEY is not configured" };
  }

  const provided = request.headers.get("x-internal-admin-key");
  if (!provided || provided !== expected) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true };
}

export function requireInternalAdminAccess(
  request: NextRequest
): { ok: true; mode: "session" | "key" } | { ok: false; status: number; error: string } {
  const adminSession = getAdminSessionFromRequest(request);
  if (adminSession) {
    return { ok: true, mode: "session" };
  }

  const byKey = requireInternalAdmin(request);
  if (byKey.ok) {
    return { ok: true, mode: "key" };
  }

  return byKey;
}
