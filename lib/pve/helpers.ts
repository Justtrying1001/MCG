import type { BattleUnitSnapshot, SimUnit, TeamCard } from "@/lib/pve/types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  };
}

export function powerScore(unit: { atk?: number; def?: number; spd?: number; ctrl?: number; ATK?: number; DEF?: number; SPD?: number; CTRL?: number }) {
  return (unit.atk ?? unit.ATK ?? 0) + (unit.def ?? unit.DEF ?? 0) + (unit.spd ?? unit.SPD ?? 0) + (unit.ctrl ?? unit.CTRL ?? 0);
}
