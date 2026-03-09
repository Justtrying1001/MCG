import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, enterContestMvp } from "@/lib/domain/contests/runtime";

export async function POST(request: Request, { params }: { params: { contestId: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json();
    const result = await enterContestMvp({
      contestId: params.contestId,
      userId: user.id,
      lineupInstanceIds: body?.lineupInstanceIds,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot enter contest");
  }
}
