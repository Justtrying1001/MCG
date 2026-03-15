import { NextRequest, NextResponse } from "next/server";

import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { handleApiError } from "@/lib/api-error";
import { syncSeasonProgressForContest } from "@/lib/domain/seasons/runtime";

export async function POST(request: NextRequest, { params }: { params: { contestId: string } }) {
  try {
    const admin = getAdminSessionFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await syncSeasonProgressForContest(params.contestId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return handleApiError(error, "Cannot sync season progression");
  }
}
