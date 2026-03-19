import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { getSalePackRuntimeConfig } from "@/lib/domain/acquisition/pack-config";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    const config = await getSalePackRuntimeConfig(user?.id);
    return NextResponse.json(config);
  } catch (error) {
    return handleApiError(error, "Cannot load pack config");
  }
}
