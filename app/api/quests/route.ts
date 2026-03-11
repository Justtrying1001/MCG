import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { listUserQuestsMvp } from "@/lib/domain/quests/runtime";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const payload = await listUserQuestsMvp(user.id);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, "Cannot load quests");
  }
}
