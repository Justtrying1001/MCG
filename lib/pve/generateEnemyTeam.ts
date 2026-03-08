import { getBaseCards } from "@/lib/cards";
import { PVE_TEAM_SIZE } from "@/lib/pve/constants";
import type { PveDifficulty, TeamCard } from "@/lib/pve/types";

function getDifficultyTargetCombatScore(difficulty: PveDifficulty) {
  if (difficulty === "easy") return 44;
  if (difficulty === "hard") return 66;
  return 55;
}

function getDifficultyWindow(difficulty: PveDifficulty) {
  if (difficulty === "easy") return 18;
  if (difficulty === "hard") return 16;
  return 17;
}

function canonicalCombatScore(card: { combatScore?: number; ATK: number; DEF: number; SPD: number; CTRL: number }) {
  if (typeof card.combatScore === "number") return card.combatScore;
  return Math.max(0, Math.min(100, Math.round(card.ATK * 0.34 + card.DEF * 0.27 + card.SPD * 0.21 + card.CTRL * 0.18)));
}

function weightedPick<T>(items: Array<{ item: T; weight: number }>) {
  const total = items.reduce((sum, x) => sum + x.weight, 0);
  let roll = Math.random() * total;

  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.item;
  }

  return items[items.length - 1].item;
}

export function generateEnemyTeam(difficulty: PveDifficulty): TeamCard[] {
  const pool = [...getBaseCards()];
  const selected: TeamCard[] = [];
  const usedIds = new Set<string>();
  const usedArchetypes = new Set<string>();
  const target = getDifficultyTargetCombatScore(difficulty);
  const baseWindow = getDifficultyWindow(difficulty);

  for (let slot = 0; slot < PVE_TEAM_SIZE; slot += 1) {
    const window = baseWindow + slot * 2;
    const candidates = pool.filter((card) => {
      if (usedIds.has(card.baseCardId)) return false;
      const score = canonicalCombatScore(card);
      return Math.abs(score - target) <= window;
    });

    const candidatePool = candidates.length > 0 ? candidates : pool.filter((card) => !usedIds.has(card.baseCardId));

    const weighted = candidatePool.map((card) => {
      const score = canonicalCombatScore(card);
      const archetype = card.archetype ?? "balanced";
      const distance = Math.abs(score - target);
      const closenessWeight = Math.max(1, 100 - distance * 5);
      const archetypeDiversityBonus = usedArchetypes.has(archetype) ? 1 : 1.35;
      return { item: card, weight: closenessWeight * archetypeDiversityBonus };
    });

    const picked = weightedPick(weighted);
    usedIds.add(picked.baseCardId);
    usedArchetypes.add(picked.archetype ?? "balanced");

    selected.push({
      baseCardId: picked.baseCardId,
      name: picked.name,
      image: picked.image,
      ATK: picked.ATK,
      DEF: picked.DEF,
      SPD: picked.SPD,
      CTRL: picked.CTRL,
      combatScore: picked.combatScore,
      archetype: picked.archetype,
    });
  }

  return selected;
}
