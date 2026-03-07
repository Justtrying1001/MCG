import { ENEMY_IMPACT_MULTIPLIER, PVE_ROUNDS } from "@/lib/pve/constants";
import { clamp, toUnitSnapshot } from "@/lib/pve/helpers";
import type { BattleActionLog, BattleUnitSnapshot, PveDifficulty, RoundSummary, SimBattleCoreResult, TeamCard } from "@/lib/pve/types";

type SimInput = {
  difficulty: PveDifficulty;
  playerTeam: TeamCard[];
  enemyTeam: TeamCard[];
};

function sortInitiative(a: BattleUnitSnapshot, b: BattleUnitSnapshot) {
  if (b.spd !== a.spd) return b.spd - a.spd;
  if (b.ctrl !== a.ctrl) return b.ctrl - a.ctrl;
  if (b.atk !== a.atk) return b.atk - a.atk;
  if (a.side !== b.side) return a.side === "player" ? -1 : 1;
  return a.slot - b.slot;
}

function pickTarget(targets: BattleUnitSnapshot[]) {
  return [...targets].sort((a, b) => {
    if (a.def !== b.def) return a.def - b.def;
    if (a.ctrl !== b.ctrl) return a.ctrl - b.ctrl;
    return a.slot - b.slot;
  })[0];
}

function computeImpact(attacker: BattleUnitSnapshot, defender: BattleUnitSnapshot, enemyImpactMult: number, actorSide: "player" | "enemy") {
  const baseImpact = attacker.atk * 1.2 + attacker.spd * 0.35 + attacker.ctrl * 0.25;
  const resistance = defender.def * 0.9 + defender.ctrl * 0.2;
  const impactBeforeVariance = Math.max(4, baseImpact - resistance);

  const baseVariance = 0.94 + Math.random() * 0.12;
  const ctrlShift = clamp((attacker.ctrl - defender.ctrl) / 500, -0.02, 0.02);
  const varianceMultiplier = clamp(baseVariance + ctrlShift, 0.95, 1.05);

  let finalImpact = Math.round(impactBeforeVariance * varianceMultiplier);

  const critChance = Math.min(0.1, 0.03 + Math.floor(attacker.ctrl / 25) / 100);
  const isCrit = Math.random() < critChance;
  if (isCrit) {
    finalImpact = Math.round(finalImpact * 1.3);
  }

  finalImpact = Math.max(1, finalImpact);

  if (actorSide === "enemy") {
    finalImpact = Math.max(1, Math.round(finalImpact * enemyImpactMult));
  }

  return { impact: finalImpact, isCrit };
}

export function simulateBattle({ difficulty, playerTeam, enemyTeam }: SimInput): SimBattleCoreResult {
  const playerUnits = playerTeam.map((card, slot) => toUnitSnapshot(card, "player", slot));
  const enemyUnits = enemyTeam.map((card, slot) => toUnitSnapshot(card, "enemy", slot));
  const enemyImpactMult = ENEMY_IMPACT_MULTIPLIER[difficulty];

  const actions: BattleActionLog[] = [];
  const rounds: RoundSummary[] = [];
  let playerRoundsWon = 0;
  let enemyRoundsWon = 0;
  let playerTotalImpact = 0;
  let enemyTotalImpact = 0;

  for (let round = 1; round <= PVE_ROUNDS; round += 1) {
    const actingOrder = [...playerUnits, ...enemyUnits].sort(sortInitiative);
    let playerRoundImpact = 0;
    let enemyRoundImpact = 0;
    const playerCardImpact: Record<string, number> = {};
    const enemyCardImpact: Record<string, number> = {};

    for (const actor of actingOrder) {
      const targetPool = actor.side === "player" ? enemyUnits : playerUnits;
      const target = pickTarget(targetPool);
      const { impact, isCrit } = computeImpact(actor, target, enemyImpactMult, actor.side);

      if (actor.side === "player") {
        playerRoundImpact += impact;
        playerCardImpact[actor.baseCardId] = (playerCardImpact[actor.baseCardId] ?? 0) + impact;
      } else {
        enemyRoundImpact += impact;
        enemyCardImpact[actor.baseCardId] = (enemyCardImpact[actor.baseCardId] ?? 0) + impact;
      }

      actions.push({
        round,
        actorSide: actor.side,
        actorSlot: actor.slot,
        actorCardId: actor.baseCardId,
        targetSide: target.side,
        targetSlot: target.slot,
        targetCardId: target.baseCardId,
        impact,
        isCrit,
      });
    }

    playerTotalImpact += playerRoundImpact;
    enemyTotalImpact += enemyRoundImpact;

    let winner: "player" | "enemy" | "draw" = "draw";
    if (playerRoundImpact > enemyRoundImpact) {
      winner = "player";
      playerRoundsWon += 1;
    } else if (enemyRoundImpact > playerRoundImpact) {
      winner = "enemy";
      enemyRoundsWon += 1;
    }

    const bestPlayerCardId = Object.entries(playerCardImpact).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const bestEnemyCardId = Object.entries(enemyCardImpact).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    rounds.push({
      round,
      playerImpact: playerRoundImpact,
      enemyImpact: enemyRoundImpact,
      winner,
      bestPlayerCardId,
      bestEnemyCardId,
    });
  }

  const result =
    playerRoundsWon > enemyRoundsWon
      ? "WIN"
      : enemyRoundsWon > playerRoundsWon
      ? "LOSS"
      : playerTotalImpact >= enemyTotalImpact
      ? "WIN"
      : "LOSS";

  return {
    result,
    playerTeam: playerUnits,
    enemyTeam: enemyUnits,
    actions,
    rounds,
    playerRoundsWon,
    enemyRoundsWon,
    playerTotalImpact,
    enemyTotalImpact,
  };
}
