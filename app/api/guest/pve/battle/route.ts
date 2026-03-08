import { NextResponse } from "next/server";
import { PVE_DAILY_TICKETS } from "@/lib/pve/constants";
import { generateEnemyTeam } from "@/lib/pve/generateEnemyTeam";
import { simulateBattle } from "@/lib/pve/simulateBattle";
import { computeRewards } from "@/lib/pve/rewards";
import { serializeBattle } from "@/lib/pve/serializeBattle";
import { assertTicketsAvailable, validateTeamIds } from "@/lib/pve/availability";
import type { GuestBattleRequest, GuestState } from "@/lib/guest";

function getNextReset(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
}

function shouldReset(lastResetAt: string, now = new Date()) {
  const last = new Date(lastResetAt);
  return (
    last.getUTCFullYear() !== now.getUTCFullYear() ||
    last.getUTCMonth() !== now.getUTCMonth() ||
    last.getUTCDate() !== now.getUTCDate()
  );
}

function applyReset(state: GuestState, now: Date) {
  if (!shouldReset(state.lastPveResetAt, now)) return state;
  return {
    ...state,
    pveBattleTickets: PVE_DAILY_TICKETS,
    lastPveResetAt: now.toISOString(),
    nextPveResetAt: getNextReset(now).toISOString(),
    collection: state.collection.map((item) => ({ ...item, pveExhausted: false })),
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as GuestBattleRequest | null;
  if (!body?.state || !body?.selectedCardIds || !body?.difficulty) {
    return new NextResponse("Invalid PvE payload", { status: 400 });
  }

  const teamError = validateTeamIds(body.selectedCardIds);
  if (teamError) return new NextResponse(teamError, { status: 400 });

  const now = new Date();
  const state = applyReset(body.state, now);
  const ticketError = assertTicketsAvailable(state.pveBattleTickets);
  if (ticketError) return new NextResponse(ticketError, { status: 400 });

  const selected = body.selectedCardIds.map((id) => state.collection.find((item) => item.baseCardId === id));
  if (selected.some((x) => !x || x.quantity <= 0)) {
    return new NextResponse("You can only select cards you own", { status: 400 });
  }
  if (selected.some((x) => x!.pveExhausted)) {
    return new NextResponse("Some selected cards are exhausted for PvE today", { status: 400 });
  }

  const playerTeam = selected.map((item) => ({
    baseCardId: item!.baseCardId,
    name: item!.card.name,
    image: item!.card.image,
    ATK: item!.card.ATK,
    DEF: item!.card.DEF,
    SPD: item!.card.SPD,
    CTRL: item!.card.CTRL,
  }));

  const enemyTeam = generateEnemyTeam(body.difficulty);
  const simulation = simulateBattle({ difficulty: body.difficulty, playerTeam, enemyTeam });
  const rewards = computeRewards(body.difficulty, simulation.result === "WIN");

  const exhaustedIds = new Set(body.selectedCardIds);
  const nextState: GuestState = {
    ...state,
    points: state.points + rewards.rewardPoints,
    pveBattleTickets: state.pveBattleTickets - 1,
    pveRunsCount: state.pveRunsCount + 1,
    collection: state.collection.map((item) =>
      exhaustedIds.has(item.baseCardId) ? { ...item, pveExhausted: true } : item,
    ),
  };

  const battle = serializeBattle({
    simulation,
    difficulty: body.difficulty,
    rewardPoints: rewards.rewardPoints,
    bonusPackAwarded: rewards.bonusPackAwarded,
    remainingBattleTickets: nextState.pveBattleTickets,
    exhaustedCardIds: body.selectedCardIds,
    rewardSummary: rewards.rewardSummary,
  });

  return NextResponse.json({ battle, state: nextState });
}
