import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

import type { AdminAccessContext } from "@/lib/admin-ops";
import { parseAdminRole, resolveSessionAdminRole } from "@/lib/admin-ops";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";

function secureStringEqual(a: string, b: string): boolean {
  // Always compare same-length buffers to avoid length-based timing leaks
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function requireInternalAdmin(request: NextRequest): { ok: true; keyId: string; role: ReturnType<typeof parseAdminRole> } | { ok: false; status: number; error: string } {
  const expected = process.env.INTERNAL_ADMIN_KEY;
  if (!expected) {
    return { ok: false, status: 503, error: "INTERNAL_ADMIN_KEY is not configured" };
  }

  const provided = request.headers.get("x-internal-admin-key");
  if (!provided || !secureStringEqual(provided, expected)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const keyId = (process.env.INTERNAL_ADMIN_KEY_ID ?? "internal-admin-service").trim() || "internal-admin-service";
  const role = parseAdminRole(process.env.INTERNAL_ADMIN_KEY_ROLE ?? "ADMIN_SUPERVISOR");
  return { ok: true, keyId, role };
}

export function requireInternalAdminAccess(request: NextRequest): AdminAccessContext {
  const adminSession = getAdminSessionFromRequest(request);
  if (adminSession) {
    const username = adminSession.username;
    return {
      ok: true,
      mode: "session",
      actor: {
        type: "admin_user",
        id: `admin:${username}`,
        label: username,
        username,
        authMode: "session",
        role: resolveSessionAdminRole(username),
      },
    };
  }

  const byKey = requireInternalAdmin(request);
  if (byKey.ok) {
    return {
      ok: true,
      mode: "key",
      actor: {
        type: "service_key",
        id: `service-key:${byKey.keyId}`,
        label: `service-key:${byKey.keyId}`,
        username: null,
        authMode: "key",
        role: byKey.role,
      },
    };
  }

  return byKey;
}
