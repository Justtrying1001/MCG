import { NextRequest, NextResponse } from "next/server";

import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, _context: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        "Legacy manual scoring import is deprecated. Use canonical scoring from snapshots at /api/internal/contest-runs/[contestId]/scoring/compute.",
    },
    { status: 410 }
  );
}
