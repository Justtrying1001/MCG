import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { GAME_CONFIG } from "@/lib/game-config";
import { handleApiError } from "@/lib/api-error";
import { openSalePackMvpDbNative, PackOpenRuntimeError } from "@/lib/domain/acquisition/open-pack";
import { PackPurchaseLimitExceededError } from "@/lib/domain/acquisition/purchase-limit";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const result = await openSalePackMvpDbNative({
      userId: user.id,
      packCost: GAME_CONFIG.PACK_COST,
    });

    if (result.pulledCardsMvp.length === 0) {
      throw new PackOpenRuntimeError("Invalid MVP pack payload", 500);
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PackPurchaseLimitExceededError) {
      return NextResponse.json({
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          purchaseLimit: error.details,
        },
      }, { status: error.status });
    }

    if (error instanceof PackOpenRuntimeError) {
      return new NextResponse(error.message, { status: error.status });
    }

    return handleApiError(error, "Cannot open pack");
  }
}
