import { NextResponse } from "next/server";

import { GAME_CONFIG } from "@/lib/game-config";
import type { GuestState } from "@/lib/guest";
import type { MvpCardView } from "@/types/cards";
import { listTokenMasterMvp50, toMvpCardViewFromTokenMasterRow } from "@/lib/domain/cards/token-master";

const CARDS_PER_PACK = 5;
const GUEST_RARITY_WEIGHTS = [
  { code: "COMMON", weight: 40 },
  { code: "UNCOMMON", weight: 30 },
  { code: "RARE", weight: 20 },
  { code: "EPIC", weight: 8 },
  { code: "LEGENDARY", weight: 2 },
] as const;
const GUEST_EDITIONS = ["BASE", "REVERSE", "BRILLANTE", "HOLO", "FULL_ART"] as const;

function normalizeGuestState(state: GuestState): GuestState {
  return {
    ...state,
    mvpCollection: state.mvpCollection ?? [],
    openingsCount: state.openingsCount ?? state.packsOpened,
  };
}

function randomWeightedRarity(): string {
  const total = GUEST_RARITY_WEIGHTS.reduce((sum, row) => sum + row.weight, 0);
  let roll = Math.random() * total;

  for (const row of GUEST_RARITY_WEIGHTS) {
    roll -= row.weight;
    if (roll <= 0) return row.code;
  }

  return "COMMON";
}

function randomEdition(): string {
  return GUEST_EDITIONS[Math.floor(Math.random() * GUEST_EDITIONS.length)] ?? "BASE";
}

function drawGuestMvpPack(): MvpCardView[] {
  const pool = listTokenMasterMvp50();
  if (pool.length === 0) return [];

  const pulled: MvpCardView[] = [];

  for (let i = 0; i < CARDS_PER_PACK; i += 1) {
    const token = pool[Math.floor(Math.random() * pool.length)]!;
    const rarity = randomWeightedRarity();
    const edition = randomEdition();
    const templateId = `guest_${token.tokenId}_${rarity}_${edition}`;

    pulled.push(
      toMvpCardViewFromTokenMasterRow({
        token,
        templateId,
        rarityCode: rarity,
        editionCode: edition,
        plannedSupply: 0,
        issuedSupply: 0,
        instanceCount: 1,
      })
    );
  }

  return pulled;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { state?: GuestState } | null;
  if (!body?.state) return new NextResponse("Invalid guest state", { status: 400 });

  const state = normalizeGuestState(body.state);
  if (state.points < GAME_CONFIG.PACK_COST) {
    return new NextResponse("Not enough points", { status: 400 });
  }

  const pulledCardsMvp = drawGuestMvpPack();
  const collection = [...state.mvpCollection];

  for (const card of pulledCardsMvp) {
    const idx = collection.findIndex((item) => item.templateId === card.templateId);
    if (idx >= 0) {
      collection[idx] = {
        ...collection[idx],
        instanceCount: collection[idx].instanceCount + 1,
        card: {
          ...collection[idx].card,
          instanceCount: collection[idx].instanceCount + 1,
          owned: true,
        },
      };
    } else {
      collection.push({
        templateId: card.templateId,
        instanceCount: 1,
        card: { ...card, instanceCount: 1, owned: true },
      });
    }
  }

  const nextState: GuestState = {
    ...state,
    points: state.points - GAME_CONFIG.PACK_COST,
    packsOpened: state.packsOpened + 1,
    openingsCount: state.openingsCount + 1,
    mvpCollection: collection,
  };

  return NextResponse.json({ pulledCardsMvp, state: nextState });
}
