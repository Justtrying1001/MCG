import type { BattleUnitSnapshot, SimUnit, TeamCard } from "@/lib/pve/types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calcMaxHp(def: number, ctrl: number) {
  return Math.round(40 + def * 2 + ctrl * 0.5);
}

export function toSimUnit(card: TeamCard, side: SimUnit["side"], slot: number, hpMult = 1): SimUnit {
  const baseHp = calcMaxHp(card.DEF, card.CTRL);
  const maxHp = Math.max(1, Math.round(baseHp * hpMult));
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
    maxHp,
    hp: maxHp,
  };
}

export function snapshotUnit(unit: SimUnit): BattleUnitSnapshot {
  return {
    side: unit.side,
    slot: unit.slot,
    baseCardId: unit.baseCardId,
    name: unit.name,
    image: unit.image,
    atk: unit.atk,
    def: unit.def,
    spd: unit.spd,
    ctrl: unit.ctrl,
    maxHp: unit.maxHp,
  };
}

export function countAlive(units: SimUnit[]) {
  return units.filter((u) => u.hp > 0).length;
}

export function totalHp(units: SimUnit[]) {
  return units.reduce((sum, unit) => sum + Math.max(0, unit.hp), 0);
}
