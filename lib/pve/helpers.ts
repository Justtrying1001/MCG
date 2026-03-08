import type { BattleUnitSnapshot, SimUnit, TeamCard } from "@/lib/pve/types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function computeCanonicalCombatScore(unit: { atk?: number; def?: number; spd?: number; ctrl?: number; ATK?: number; DEF?: number; SPD?: number; CTRL?: number }) {
  const atk = unit.atk ?? unit.ATK ?? 0;
  const def = unit.def ?? unit.DEF ?? 0;
  const spd = unit.spd ?? unit.SPD ?? 0;
  const ctrl = unit.ctrl ?? unit.CTRL ?? 0;

  return Math.max(0, Math.min(100, Math.round(atk * 0.34 + def * 0.27 + spd * 0.21 + ctrl * 0.18)));
}

export function toUnitSnapshot(card: TeamCard, side: SimUnit["side"], slot: number): BattleUnitSnapshot {
  return {
    side,
    slot,
    baseCardId: card.baseCardId,
    name: card.name,
    image: card.image,
    atk: card.ATK,
    def: card.DEF,
    spd: card.SPD,
    ctrl: card.CTRL,
    combatScore: card.combatScore ?? computeCanonicalCombatScore(card),
    archetype: card.archetype ?? "balanced",
  };
}

export function powerScore(unit: { atk?: number; def?: number; spd?: number; ctrl?: number; ATK?: number; DEF?: number; SPD?: number; CTRL?: number; combatScore?: number }) {
  return unit.combatScore ?? computeCanonicalCombatScore(unit);
}
