import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { publishContest } from "@/lib/domain/contests/config-runtime";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const result = await publishContest(params.contestId);
    return NextResponse.json({ ok: true, contest: result.contest });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return handleApiError(error, "Cannot publish contest draft");
  }
}
