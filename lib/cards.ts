import { readFileSync } from "node:fs";
import path from "node:path";
import type { BaseCard, BaseCardFinish, BaseCardRarity } from "@/types/cards";
import {
  buildCollectorId,
  computeArchetype,
  computeCombatScore,
  mapBaseRarityFromProjectTier,
  mapFinishFromVariantType,
} from "@/lib/cards-mapping";

const CARDS_PER_PACK = 5;

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

type WeightedRarity = { rarity: BaseCardRarity; weight: number };
type WeightedFinish = { finish: BaseCardFinish; weight: number };
type PackSlot =
  | { slot: "A" | "B"; type: "fixed"; rarity: "common" }
  | { slot: "C" | "D"; type: "weighted"; options: WeightedRarity[] }
  | { slot: "E"; type: "weighted"; options: WeightedRarity[] };

/**
 * Canonical pack slot structure (Lot 2):
 * A/B: common
 * C/D: rare+ 78/20/2
 * E: epic+ 72/28
 */
const PACK_SLOT_TABLE: PackSlot[] = [
  { slot: "A", type: "fixed", rarity: "common" },
  { slot: "B", type: "fixed", rarity: "common" },
  {
    slot: "C",
    type: "weighted",
    options: [
      { rarity: "rare", weight: 78 },
      { rarity: "epic", weight: 20 },
      { rarity: "legendary", weight: 2 },
    ],
  },
  {
    slot: "D",
    type: "weighted",
    options: [
      { rarity: "rare", weight: 78 },
      { rarity: "epic", weight: 20 },
      { rarity: "legendary", weight: 2 },
    ],
  },
  {
    slot: "E",
    type: "weighted",
    options: [
      { rarity: "epic", weight: 72 },
      { rarity: "legendary", weight: 28 },
    ],
  },
];

/**
 * Canonical finish roll table (Lot 2), applied after base card rarity is selected.
 */
const FINISH_ODDS_BY_RARITY: Record<BaseCardRarity, WeightedFinish[]> = {
  common: [
    { finish: "standard", weight: 94 },
    { finish: "holo", weight: 6 },
  ],
  rare: [
    { finish: "standard", weight: 78 },
    { finish: "holo", weight: 18 },
    { finish: "full_art", weight: 4 },
  ],
  epic: [
    { finish: "standard", weight: 55 },
    { finish: "holo", weight: 28 },
    { finish: "full_art", weight: 12 },
    { finish: "glitch", weight: 5 },
  ],
  legendary: [
    { finish: "standard", weight: 30 },
    { finish: "holo", weight: 35 },
    { finish: "full_art", weight: 20 },
    { finish: "glitch", weight: 10 },
    { finish: "gold", weight: 5 },
  ],
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
  const ATK = baseCard.ATK;
  const DEF = baseCard.DEF;
  const SPD = baseCard.SPD;
  const CTRL = baseCard.CTRL;
  const baseRarity = mapBaseRarityFromProjectTier(baseCard.projectTier);
  const finish = mapFinishFromVariantType(defaultVariant?.variantType);
  const combatScore = computeCombatScore({ ATK, DEF, SPD, CTRL });
  const archetype = computeArchetype({ ATK, DEF, SPD, CTRL });
  const collectorId = buildCollectorId({
    baseCardId: baseCard.baseCardId,
    baseRarity,
    marketCapRank: baseCard.marketCapRank ?? project?.marketCapRank ?? null,
  });

  return {
    ...baseCard,
    image: baseCard.image || project?.image || "",
    faction: baseCard.faction ?? project?.faction ?? "Other",
    primaryChain: baseCard.primaryChain ?? project?.primaryChain ?? "Other",
    marketCapRank: baseCard.marketCapRank ?? project?.marketCapRank ?? null,
    variantId: defaultVariant?.variantId,
    variantType: defaultVariant?.variantType ?? "standard",
    variantRarity: defaultVariant?.variantRarity ?? "common",
    baseRarity,
    finish,
    combatScore,
    archetype,
    collectorId,
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

function drawWeighted<T>(pool: Array<{ item: T; weight: number }>): T {
  const total = pool.reduce((sum, x) => sum + x.weight, 0);
  let roll = Math.random() * total;

  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }

  return pool[pool.length - 1].item;
}

function drawRarityForSlot(slot: PackSlot): BaseCardRarity {
  if (slot.type === "fixed") return slot.rarity;
  return drawWeighted(slot.options.map((option) => ({ item: option.rarity, weight: option.weight })));
}

function drawFinishForRarity(rarity: BaseCardRarity): BaseCardFinish {
  const table = FINISH_ODDS_BY_RARITY[rarity];
  return drawWeighted(table.map((option) => ({ item: option.finish, weight: option.weight })));
}

function pickCardFromRarityBucket(cards: BaseCard[], rarity: BaseCardRarity, usedIds: Set<string>): BaseCard {
  const exactPool = cards.filter((card) => (card.baseRarity ?? "common") === rarity && !usedIds.has(card.baseCardId));
  if (exactPool.length > 0) {
    return exactPool[Math.floor(Math.random() * exactPool.length)];
  }

  const fallbackPool = cards.filter((card) => !usedIds.has(card.baseCardId));
  if (fallbackPool.length > 0) {
    return fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  }

  // Defensive fallback (should never happen with current dataset size > pack size).
  return cards[Math.floor(Math.random() * cards.length)];
}

function getVariantForFinish(baseCardId: string, finish: BaseCardFinish): CardVariant | undefined {
  const variants = getVariantsByBaseCard().get(baseCardId) ?? [];
  const exact = variants.find((variant) => mapFinishFromVariantType(variant.variantType) === finish);
  if (exact) return exact;

  return variants.find((variant) => variant.isDefaultVariant) ?? variants[0];
}

function applyFinishToCard(card: BaseCard, finish: BaseCardFinish): BaseCard {
  const variant = getVariantForFinish(card.baseCardId, finish);
  const variantType = (variant?.variantType ?? finish) as string;

  return {
    ...card,
    finish,
    variantType,
    variantId: variant?.variantId ?? card.variantId,
    variantRarity: variant?.variantRarity ?? card.variantRarity,
    frameStyle: variant?.frameStyle ?? card.frameStyle,
    variantLabel: VARIANT_LABEL[variantType] ?? VARIANT_LABEL[finish] ?? "STD",
  };
}

export function getPackOpeningOdds() {
  return {
    slots: PACK_SLOT_TABLE,
    finishByRarity: FINISH_ODDS_BY_RARITY,
  };
}

export function openBasePack(cards: BaseCard[]): BaseCard[] {
  const pulled: BaseCard[] = [];
  const usedBaseCardIds = new Set<string>();

  for (const slot of PACK_SLOT_TABLE) {
    const rarity = drawRarityForSlot(slot);
    const baseCard = pickCardFromRarityBucket(cards, rarity, usedBaseCardIds);
    usedBaseCardIds.add(baseCard.baseCardId);

    const finish = drawFinishForRarity(rarity);
    pulled.push(applyFinishToCard(baseCard, finish));
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
