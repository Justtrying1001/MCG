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
        "Legacy manual settlement is deprecated. Use canonical settlement plan endpoints under /api/internal/contest-runs/[contestId]/settlement-plan/*.",
    },
    { status: 410 }
  );
}
