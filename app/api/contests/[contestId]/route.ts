import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, getContestDetailMvp } from "@/lib/domain/contests/runtime";

export async function GET(_request: Request, { params }: { params: { contestId: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const detail = await getContestDetailMvp(params.contestId, user.id);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot load contest detail");
  }
}
