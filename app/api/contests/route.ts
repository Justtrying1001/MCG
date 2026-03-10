import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { listContestsMvp } from "@/lib/domain/contests/runtime";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const contests = await listContestsMvp();
    return NextResponse.json({ contests });
  } catch (error) {
    return handleApiError(error, "Cannot load contests");
  }
}
