import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { GAME_CONFIG } from "@/lib/game-config";
import { handleApiError } from "@/lib/api-error";
import { openSalePackMvpDbNative, PackOpenRuntimeError } from "@/lib/domain/acquisition/open-pack";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const result = await openSalePackMvpDbNative({
      userId: user.id,
      packCost: GAME_CONFIG.PACK_COST,
    });

    if (result.pulledCardsMvp.length === 0 || result.pulledCardsMvp.length !== result.pulledCards.length) {
      throw new PackOpenRuntimeError("Invalid MVP pack payload", 500);
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PackOpenRuntimeError) {
      return new NextResponse(error.message, { status: error.status });
    }

    return handleApiError(error, "Cannot open pack");
  }
}
