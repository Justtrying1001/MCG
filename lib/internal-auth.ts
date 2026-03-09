import { NextRequest } from "next/server";

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
