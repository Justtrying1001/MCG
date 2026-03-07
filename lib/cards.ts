import { readFileSync } from "node:fs";
import path from "node:path";
import type { BaseCard } from "@/types/cards";

const CARDS_PER_PACK = 5;
const tierBaseWeight: Record<string, number> = { S: 1, A: 2, B: 4, C: 6, D: 8 };

let cachedCards: BaseCard[] | null = null;

export function getBaseCards(): BaseCard[] {
  if (cachedCards) return cachedCards;

  const filePath = path.join(process.cwd(), "mcg_base_cards.json");
  const raw = readFileSync(filePath, "utf-8");
  const cards = JSON.parse(raw) as BaseCard[];
  cachedCards = cards.filter((c) => c.isEligible !== false);
  return cachedCards;
}

export function getCardsMap(): Map<string, BaseCard> {
  return new Map(getBaseCards().map((c) => [c.baseCardId, c]));
}

function weightedCardsPool(cards: BaseCard[]) {
  return cards.map((card) => {
    const tier = card.projectTier || "D";
    const base = tierBaseWeight[tier] ?? 8;
    const rank = Number(card.marketCapRank) || 1000;
    const rankFactor = Math.max(0.3, 1 - Math.min(rank, 2000) / 3000);
    return { card, weight: base * (1 + rankFactor) };
  });
}

function drawWeighted(pool: Array<{ card: BaseCard; weight: number }>): BaseCard {
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let roll = Math.random() * total;

  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.card;
  }

  return pool[pool.length - 1].card;
}

export function openBasePack(cards: BaseCard[]): BaseCard[] {
  const pool = weightedCardsPool(cards);
  const pulled: BaseCard[] = [];
  for (let i = 0; i < CARDS_PER_PACK; i += 1) {
    pulled.push(drawWeighted(pool));
  }
  return pulled;
}

export const GAME_CONFIG = {
  STARTING_POINTS: 300,
  PACK_COST: 100,
  CARDS_PER_PACK,
  PVE_DIFFICULTY: {
    easy: { enemyMult: 0.9, reward: 80 },
    normal: { enemyMult: 1.0, reward: 120 },
    hard: { enemyMult: 1.2, reward: 180 },
  },
} as const;

export type PveDifficulty = keyof typeof GAME_CONFIG.PVE_DIFFICULTY;
