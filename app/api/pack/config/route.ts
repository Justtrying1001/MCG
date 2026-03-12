import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { getSalePackRuntimeConfig } from "@/lib/domain/acquisition/pack-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getSalePackRuntimeConfig();
    return NextResponse.json(config);
  } catch (error) {
    return handleApiError(error, "Cannot load pack config");
  }
}
