import { getBaseCards } from "@/lib/cards";
import { PVE_TEAM_SIZE } from "@/lib/pve/constants";
import type { PveDifficulty, TeamCard } from "@/lib/pve/types";

function tierWeight(tier?: string) {
  if (tier === "S") return 1.4;
  if (tier === "A") return 1.2;
  if (tier === "B") return 1.08;
  if (tier === "C") return 1;
  return 0.9;
}

function diffPoolBias(difficulty: PveDifficulty) {
  if (difficulty === "easy") return 0.95;
  if (difficulty === "hard") return 1.06;
  return 1;
}

export function generateEnemyTeam(difficulty: PveDifficulty): TeamCard[] {
  const pool = [...getBaseCards()];
  const result: TeamCard[] = [];
  const bias = diffPoolBias(difficulty);

  while (result.length < PVE_TEAM_SIZE && pool.length > 0) {
    const weighted = pool.map((card) => {
      const stats = card.ATK + card.DEF + card.SPD + card.CTRL;
      const weight = Math.max(1, stats * tierWeight(card.projectTier) * bias);
      return { card, weight };
    });

    const total = weighted.reduce((sum, x) => sum + x.weight, 0);
    let roll = Math.random() * total;
    let picked = weighted[weighted.length - 1].card;
    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) {
        picked = item.card;
        break;
      }
    }

    result.push({
      baseCardId: picked.baseCardId,
      name: picked.name,
      image: picked.image,
      ATK: picked.ATK,
      DEF: picked.DEF,
      SPD: picked.SPD,
      CTRL: picked.CTRL,
    });

    const idx = pool.findIndex((x) => x.baseCardId === picked.baseCardId);
    if (idx >= 0) pool.splice(idx, 1);
  }

  return result;
}
