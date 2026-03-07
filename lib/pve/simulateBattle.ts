import { DIFFICULTY_MODIFIERS, MAX_BATTLE_ROUNDS } from "@/lib/pve/constants";
import { clamp, countAlive, snapshotUnit, toSimUnit, totalHp } from "@/lib/pve/helpers";
import type { BattleActionLog, BattleResult, PveDifficulty, TeamCard } from "@/lib/pve/types";

type SimInput = {
  difficulty: PveDifficulty;
  playerTeam: TeamCard[];
  enemyTeam: TeamCard[];
};

function sortInitiative(a: { spd: number; ctrl: number; atk: number; slot: number }, b: { spd: number; ctrl: number; atk: number; slot: number }) {
  if (b.spd !== a.spd) return b.spd - a.spd;
  if (b.ctrl !== a.ctrl) return b.ctrl - a.ctrl;
  if (b.atk !== a.atk) return b.atk - a.atk;
  return a.slot - b.slot;
}

function pickTarget(units: ReturnType<typeof toSimUnit>[]) {
  const alive = units.filter((u) => u.hp > 0);
  alive.sort((a, b) => {
    const aHpPct = a.hp / a.maxHp;
    const bHpPct = b.hp / b.maxHp;
    if (aHpPct !== bHpPct) return aHpPct - bHpPct;
    if (a.def !== b.def) return a.def - b.def;
    return a.slot - b.slot;
  });
  return alive[0] ?? null;
}

function rollDamage(actor: ReturnType<typeof toSimUnit>, target: ReturnType<typeof toSimUnit>, actorDamageMult: number) {
  const rawDamage = actor.atk * 1.35 * actorDamageMult;
  const mitigation = target.def * 0.75;
  const baseDamage = Math.max(8, rawDamage - mitigation);

  const baseRoll = 0.9 + Math.random() * 0.2;
  const ctrlDelta = clamp((actor.ctrl - target.ctrl) / 400, -0.03, 0.03);
  const varianceMultiplier = clamp(baseRoll + ctrlDelta, 0.92, 1.08);

  const critChance = Math.min(0.12, 0.03 + Math.floor(actor.ctrl / 25) / 100);
  const isCrit = Math.random() < critChance;
  const totalDamage = Math.round(baseDamage * varianceMultiplier * (isCrit ? 1.35 : 1));

  return { damage: Math.max(1, totalDamage), isCrit };
}

function resolveByRoundCap(player: ReturnType<typeof toSimUnit>[], enemy: ReturnType<typeof toSimUnit>[]): BattleResult {
  const playerAlive = countAlive(player);
  const enemyAlive = countAlive(enemy);

  if (playerAlive !== enemyAlive) return playerAlive > enemyAlive ? "WIN" : "LOSS";

  const playerHp = totalHp(player);
  const enemyHp = totalHp(enemy);
  if (playerHp >= enemyHp) return "WIN";
  return "LOSS";
}

export function simulateBattle({ difficulty, playerTeam, enemyTeam }: SimInput) {
  const mods = DIFFICULTY_MODIFIERS[difficulty];
  const player = playerTeam.map((card, slot) => toSimUnit(card, "player", slot, 1));
  const enemy = enemyTeam.map((card, slot) => toSimUnit(card, "enemy", slot, mods.hpMult));

  const rounds: BattleActionLog[] = [];

  for (let round = 1; round <= MAX_BATTLE_ROUNDS; round += 1) {
    const turnOrder = [...player, ...enemy].filter((u) => u.hp > 0).sort(sortInitiative);

    for (const actor of turnOrder) {
      if (actor.hp <= 0) continue;

      const targets = actor.side === "player" ? enemy : player;
      const target = pickTarget(targets);
      if (!target) break;

      const actorDamageMult = actor.side === "enemy" ? mods.damageMult : 1;
      const { damage, isCrit } = rollDamage(actor, target, actorDamageMult);

      target.hp = Math.max(0, target.hp - damage);
      rounds.push({
        round,
        actorSide: actor.side,
        actorSlot: actor.slot,
        targetSide: target.side,
        targetSlot: target.slot,
        damage,
        isCrit,
        targetRemainingHp: target.hp,
        targetDefeated: target.hp <= 0,
      });

      if (countAlive(player) === 0 || countAlive(enemy) === 0) {
        const result: BattleResult = countAlive(enemy) === 0 ? "WIN" : "LOSS";
        return {
          result,
          playerTeam: player.map(snapshotUnit),
          enemyTeam: enemy.map(snapshotUnit),
          rounds,
          totalRounds: round,
          battleStats: {
            survivingPlayerUnits: countAlive(player),
            survivingEnemyUnits: countAlive(enemy),
            playerHpRemaining: totalHp(player),
            enemyHpRemaining: totalHp(enemy),
            damageDone: enemy.reduce((sum, u) => sum + (u.maxHp - u.hp), 0),
            damageTaken: player.reduce((sum, u) => sum + (u.maxHp - u.hp), 0),
          },
        };
      }
    }
  }

  const result = resolveByRoundCap(player, enemy);
  return {
    result,
    playerTeam: player.map(snapshotUnit),
    enemyTeam: enemy.map(snapshotUnit),
    rounds,
    totalRounds: MAX_BATTLE_ROUNDS,
    battleStats: {
      survivingPlayerUnits: countAlive(player),
      survivingEnemyUnits: countAlive(enemy),
      playerHpRemaining: totalHp(player),
      enemyHpRemaining: totalHp(enemy),
      damageDone: enemy.reduce((sum, u) => sum + (u.maxHp - u.hp), 0),
      damageTaken: player.reduce((sum, u) => sum + (u.maxHp - u.hp), 0),
    },
  };
}
