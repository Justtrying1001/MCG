import { readFileSync } from "node:fs";
import path from "node:path";
import type { BaseCard } from "@/types/cards";

const CARDS_PER_PACK = 5;
const tierBaseWeight: Record<string, number> = { S: 1, A: 2, B: 4, C: 6, D: 8 };

const CHAIN_THEME: Record<string, { color: string; glow: string; art: string }> = {
  Solana: { color: "#14f195", glow: "rgba(20,241,149,0.28)", art: "radial-gradient(ellipse at 50% 65%,#042e1e 0%,#010b07 100%)" },
  Ethereum: { color: "#627eea", glow: "rgba(98,126,234,0.28)", art: "radial-gradient(ellipse at 50% 65%,#0e1540 0%,#050818 100%)" },
  Base: { color: "#0052ff", glow: "rgba(0,82,255,0.26)", art: "radial-gradient(ellipse at 50% 65%,#00083a 0%,#02040f 100%)" },
  BNB: { color: "#f3ba2f", glow: "rgba(243,186,47,0.24)", art: "radial-gradient(ellipse at 50% 65%,#1e1500 0%,#090700 100%)" },
  Dogecoin: { color: "#c2a633", glow: "rgba(194,166,51,0.28)", art: "radial-gradient(ellipse at 50% 65%,#1e1700 0%,#0a0900 100%)" },
  Sui: { color: "#4da2ff", glow: "rgba(77,162,255,0.26)", art: "radial-gradient(ellipse at 50% 65%,#041528 0%,#020810 100%)" },
  TON: { color: "#0098ea", glow: "rgba(0,152,234,0.24)", art: "radial-gradient(ellipse at 50% 65%,#001e2a 0%,#010a0f 100%)" },
  Tron: { color: "#eb0029", glow: "rgba(235,0,41,0.24)", art: "radial-gradient(ellipse at 50% 65%,#1e0003 0%,#090001 100%)" },
  Other: { color: "#64748b", glow: "rgba(100,116,139,0.16)", art: "radial-gradient(ellipse at 50% 65%,#0d1218 0%,#060810 100%)" },
};

const VARIANT_LABEL: Record<string, string> = {
  standard: "STD",
  holo: "HOLO",
  full_art: "FULL ART",
  glitch: "GLITCH",
  gold: "GOLD",
};

type CardVariant = {
  variantId: string;
  baseCardId: string;
  variantType: string;
  variantRarity: string;
  frameStyle: string;
  foil: boolean;
  fullArt: boolean;
  specialTreatment: boolean;
  dropWeight: number;
  isDefaultVariant: boolean;
};

type ProjectMetadata = {
  projectId: string;
  coingeckoId: string;
  primaryChain: string;
  faction: string | null;
  marketCapRank: number | null;
  image: string;
};

let cachedCards: BaseCard[] | null = null;
let cachedProjects: Map<string, ProjectMetadata> | null = null;
let cachedVariantsByBaseCard: Map<string, CardVariant[]> | null = null;

function getProjectsMap() {
  if (cachedProjects) return cachedProjects;
  const filePath = path.join(process.cwd(), "mcg_projects.json");
  const raw = readFileSync(filePath, "utf-8");
  const projects = JSON.parse(raw) as ProjectMetadata[];
  cachedProjects = new Map(projects.map((p) => [p.projectId, p]));
  return cachedProjects;
}

function getVariantsByBaseCard() {
  if (cachedVariantsByBaseCard) return cachedVariantsByBaseCard;
  const filePath = path.join(process.cwd(), "mcg_card_variants.json");
  const raw = readFileSync(filePath, "utf-8");
  const variants = JSON.parse(raw) as CardVariant[];
  cachedVariantsByBaseCard = variants.reduce((acc, variant) => {
    const list = acc.get(variant.baseCardId) ?? [];
    list.push(variant);
    acc.set(variant.baseCardId, list);
    return acc;
  }, new Map<string, CardVariant[]>());
  return cachedVariantsByBaseCard;
}

function hydrateCard(baseCard: BaseCard): BaseCard {
  const project = baseCard.projectId ? getProjectsMap().get(baseCard.projectId) : undefined;
  const variants = getVariantsByBaseCard().get(baseCard.baseCardId) ?? [];
  const defaultVariant = variants.find((variant) => variant.isDefaultVariant) ?? variants[0];
  const theme = CHAIN_THEME[baseCard.faction || "Other"] ?? CHAIN_THEME.Other;

  return {
    ...baseCard,
    image: baseCard.image || project?.image || "",
    faction: baseCard.faction ?? project?.faction ?? "Other",
    primaryChain: baseCard.primaryChain ?? project?.primaryChain ?? "Other",
    marketCapRank: baseCard.marketCapRank ?? project?.marketCapRank ?? null,
    variantId: defaultVariant?.variantId,
    variantType: defaultVariant?.variantType ?? "standard",
    variantRarity: defaultVariant?.variantRarity ?? "common",
    frameStyle: defaultVariant?.frameStyle ?? "default",
    variantLabel: VARIANT_LABEL[defaultVariant?.variantType ?? "standard"] ?? "STD",
    chainColor: theme.color,
    chainGlow: theme.glow,
    chainArt: theme.art,
  };
}

export function getBaseCards(): BaseCard[] {
  if (cachedCards) return cachedCards;

  const filePath = path.join(process.cwd(), "mcg_base_cards.json");
  const raw = readFileSync(filePath, "utf-8");
  const cards = JSON.parse(raw) as BaseCard[];
  cachedCards = cards.filter((c) => c.isEligible !== false).map(hydrateCard);
  return cachedCards;
}

export function getCardsMap(): Map<string, BaseCard> {
  return new Map(getBaseCards().map((c) => [c.baseCardId, c]));
}

function weightedCardsPool(cards: BaseCard[]) {
  return cards.map((card) => {
    const variants = getVariantsByBaseCard().get(card.baseCardId) ?? [];
    const defaultVariant = variants.find((variant) => variant.isDefaultVariant) ?? variants[0];
    const variantWeight = defaultVariant?.dropWeight ?? 1000;
    const tier = card.projectTier || "D";
    const base = tierBaseWeight[tier] ?? 8;
    const rank = Number(card.marketCapRank) || 1000;
    const rankFactor = Math.max(0.3, 1 - Math.min(rank, 2000) / 3000);
    return { card, weight: base * (1 + rankFactor) * (variantWeight / 1000) };
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
