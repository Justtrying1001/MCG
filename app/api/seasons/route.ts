import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { ensureCurrentSeason, ensureDefaultLeagues, listSeasonsOverview } from "@/lib/domain/seasons/runtime";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    await ensureDefaultLeagues();
    await ensureCurrentSeason();
    const seasons = await listSeasonsOverview(user.id);

    return NextResponse.json({ seasons });
  } catch (error) {
    return handleApiError(error, "Cannot load seasons");
  }
}
