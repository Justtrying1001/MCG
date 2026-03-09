import { ContestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, createContestMvp } from "@/lib/domain/contests/runtime";
import { requireInternalAdmin } from "@/lib/internal-auth";

export async function POST(request: NextRequest) {
  const auth = requireInternalAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();

    const contest = await createContestMvp({
      code: body?.code,
      title: body?.title,
      startsAt: body?.startsAt,
      lockAt: body?.lockAt,
      endsAt: body?.endsAt,
      status: body?.status as ContestStatus | undefined,
      maxRosterSize: body?.maxRosterSize,
      cardSetId: body?.cardSetId,
      config: body?.config,
    });

    return NextResponse.json({ contest }, { status: 201 });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot create contest");
  }
}
