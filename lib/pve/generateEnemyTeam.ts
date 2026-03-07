import { getBaseCards } from "@/lib/cards";
import { PVE_TEAM_SIZE } from "@/lib/pve/constants";
import type { PveDifficulty, TeamCard } from "@/lib/pve/types";

function tierWeight(tier?: string) {
  if (tier === "S") return 1.45;
  if (tier === "A") return 1.25;
  if (tier === "B") return 1.1;
  if (tier === "C") return 1;
  return 0.9;
}

function diffBias(difficulty: PveDifficulty) {
  if (difficulty === "easy") return 0.92;
  if (difficulty === "hard") return 1.08;
  return 1;
}

function drawUniqueWeighted<T>(items: T[], weight: (item: T) => number, count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];

  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, item) => sum + Math.max(0.01, weight(item)), 0);
    let roll = Math.random() * total;
    let index = 0;
    for (; index < pool.length; index += 1) {
      roll -= Math.max(0.01, weight(pool[index]));
      if (roll <= 0) break;
    }
    picked.push(pool[Math.min(index, pool.length - 1)]);
    pool.splice(Math.min(index, pool.length - 1), 1);
  }

  return picked;
}

export function generateEnemyTeam(difficulty: PveDifficulty): TeamCard[] {
  const cards = getBaseCards();
  const bias = diffBias(difficulty);
  const enemy = drawUniqueWeighted(
    cards,
    (card) => {
      const statValue = card.ATK + card.DEF + card.SPD + card.CTRL;
      return statValue * tierWeight(card.projectTier) * bias;
    },
    PVE_TEAM_SIZE,
  );

  return enemy.map((card) => ({
    baseCardId: card.baseCardId,
    name: card.name,
    image: card.image,
    ATK: card.ATK,
    DEF: card.DEF,
    SPD: card.SPD,
    CTRL: card.CTRL,
  }));
}
