import { readFileSync } from "node:fs";
import path from "node:path";

import type { BaseCard, MvpCardView } from "@/types/cards";

type TokenMasterRow = {
  tokenId: string;
  setOrder: number;
  sourceCsvRow: number | null;
  displayName: string;
  symbol: string;
  slug: string;
  coingeckoId: string;
  projectId: string | null;
  baseCardId: string | null;
  imageUrl: string | null;
  primaryChain: string | null;
  faction: string | null;
  marketCapRank: number | null;
  projectTier: string | null;
  isMvpEligible: boolean;
  editorial?: {
    cardTitle?: string;
    cardSubtitle?: string;
    flavorText?: string;
  };
  legacyVariantBridge?: {
    variantId?: string;
    variantType?: string;
    variantRarity?: string;
    frameStyle?: string;
    isDefaultVariant?: boolean;
  } | null;
};

type TokenMasterPayload = {
  version: number;
  tokens: TokenMasterRow[];
};

const TOKEN_MASTER_PATH = path.join(process.cwd(), "data", "token-master-50.json");

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

let cachedPayload: TokenMasterPayload | null = null;
let cachedByTokenId: Map<string, TokenMasterRow> | null = null;
let cachedBySlug: Map<string, TokenMasterRow> | null = null;
let cachedBySymbol: Map<string, TokenMasterRow> | null = null;
let cachedByCoingeckoId: Map<string, TokenMasterRow> | null = null;
let cachedByBaseCardId: Map<string, TokenMasterRow> | null = null;

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function ensureLoaded() {
  if (cachedPayload) return;
  const payload = JSON.parse(readFileSync(TOKEN_MASTER_PATH, "utf8")) as TokenMasterPayload;

  cachedPayload = payload;
  cachedByTokenId = new Map();
  cachedBySlug = new Map();
  cachedBySymbol = new Map();
  cachedByCoingeckoId = new Map();
  cachedByBaseCardId = new Map();

  for (const token of payload.tokens ?? []) {
    cachedByTokenId.set(normalize(token.tokenId), token);
    cachedBySlug.set(normalize(token.slug), token);
    cachedBySymbol.set(normalize(token.symbol), token);
    cachedByCoingeckoId.set(normalize(token.coingeckoId), token);
    if (token.baseCardId) {
      cachedByBaseCardId.set(normalize(token.baseCardId), token);
    }
  }
}

function tierStats(projectTier: string | null | undefined) {
  const tier = projectTier ?? "C";
  if (tier === "S") return { ATK: 95, DEF: 88, SPD: 82, CTRL: 90 };
  if (tier === "A") return { ATK: 86, DEF: 80, SPD: 76, CTRL: 82 };
  if (tier === "B") return { ATK: 76, DEF: 72, SPD: 70, CTRL: 74 };
  if (tier === "D") return { ATK: 58, DEF: 56, SPD: 55, CTRL: 57 };
  return { ATK: 66, DEF: 64, SPD: 62, CTRL: 65 };
}

export function listTokenMasterMvp50() {
  ensureLoaded();
  return [...(cachedPayload?.tokens ?? [])];
}

export function findTokenMasterByTokenId(tokenId: string) {
  ensureLoaded();
  return cachedByTokenId?.get(normalize(tokenId)) ?? null;
}

export function findTokenMasterBySlug(slug: string) {
  ensureLoaded();
  return cachedBySlug?.get(normalize(slug)) ?? null;
}

export function findTokenMasterBySymbol(symbol: string) {
  ensureLoaded();
  return cachedBySymbol?.get(normalize(symbol)) ?? null;
}

export function findTokenMasterByCoingeckoId(coingeckoId: string) {
  ensureLoaded();
  return cachedByCoingeckoId?.get(normalize(coingeckoId)) ?? null;
}

export function findTokenMasterByBaseCardId(baseCardId: string) {
  ensureLoaded();
  return cachedByBaseCardId?.get(normalize(baseCardId)) ?? null;
}

export function toLegacyBaseCardFromTokenMaster(token: TokenMasterRow): BaseCard {
  const theme = CHAIN_THEME[token.faction || "Other"] ?? CHAIN_THEME.Other;
  const stats = tierStats(token.projectTier);
  const powerScore = Math.round((stats.ATK + stats.DEF + stats.SPD + stats.CTRL) / 4);

  return {
    baseCardId: token.baseCardId ?? `base_${token.slug}`,
    projectId: token.projectId ?? undefined,
    coingeckoId: token.coingeckoId,
    name: token.displayName,
    symbol: token.symbol,
    slug: token.slug,
    image: token.imageUrl ?? "",
    primaryChain: token.primaryChain ?? "Other",
    faction: token.faction ?? "Other",
    subtitle: token.editorial?.cardSubtitle,
    projectTier: token.projectTier ?? "C",
    marketCapRank: token.marketCapRank,
    ATK: stats.ATK,
    DEF: stats.DEF,
    SPD: stats.SPD,
    CTRL: stats.CTRL,
    powerScore,
    variantId: token.legacyVariantBridge?.variantId,
    variantType: token.legacyVariantBridge?.variantType ?? "standard",
    variantRarity: token.legacyVariantBridge?.variantRarity ?? "common",
    frameStyle: token.legacyVariantBridge?.frameStyle ?? "default",
    variantLabel: (token.legacyVariantBridge?.variantType ?? "standard").toUpperCase(),
    chainColor: theme.color,
    chainGlow: theme.glow,
    chainArt: theme.art,
    isEligible: token.isMvpEligible,
  };
}

export function toMvpCardViewFromTokenMasterRow(input: {
  token: TokenMasterRow;
  templateId: string;
  rarityCode: string;
  editionCode: string;
  plannedSupply: number;
  issuedSupply: number;
  instanceCount?: number;
}): MvpCardView {
  const remainingSupply = Math.max(input.plannedSupply - input.issuedSupply, 0);

  return {
    templateId: input.templateId,
    tokenId: input.token.tokenId,
    displayName: input.token.displayName,
    symbol: input.token.symbol,
    slug: input.token.slug,
    imageUrl: input.token.imageUrl,
    primaryChain: input.token.primaryChain,
    faction: input.token.faction,
    rarity: input.rarityCode,
    edition: input.editionCode,
    plannedSupply: input.plannedSupply,
    issuedSupply: input.issuedSupply,
    remainingSupply,
    owned: (input.instanceCount ?? 0) > 0,
    instanceCount: input.instanceCount ?? 0,
  };
}

export type { TokenMasterRow };
