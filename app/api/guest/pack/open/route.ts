import { NextResponse } from "next/server";
import { getBaseCards, openBasePack } from "@/lib/cards";
import { GAME_CONFIG } from "@/lib/game-config";
import type { GuestState } from "@/lib/guest";

function normalizeGuestState(state: GuestState): GuestState {
  return {
    ...state,
    collection: state.collection ?? [],
    openingsCount: state.openingsCount ?? state.packsOpened,
    pveRunsCount: state.pveRunsCount ?? 0,
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { state?: GuestState } | null;
  if (!body?.state) return new NextResponse("Invalid guest state", { status: 400 });

  const state = normalizeGuestState(body.state);
  if (state.points < GAME_CONFIG.PACK_COST) {
    return new NextResponse("Not enough points", { status: 400 });
  }

  const pulledCards = openBasePack(getBaseCards());
  const collection = [...state.collection];

  for (const card of pulledCards) {
    const idx = collection.findIndex((item) => item.baseCardId === card.baseCardId);
    if (idx >= 0) {
      collection[idx] = { ...collection[idx], quantity: collection[idx].quantity + 1 };
    } else {
      collection.push({ baseCardId: card.baseCardId, quantity: 1, pveExhausted: false, card });
    }
  }

  const nextState: GuestState = {
    ...state,
    points: state.points - GAME_CONFIG.PACK_COST,
    packsOpened: state.packsOpened + 1,
    openingsCount: state.openingsCount + 1,
    collection,
  };

  return NextResponse.json({ pulledCards, state: nextState });
}
