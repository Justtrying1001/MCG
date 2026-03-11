import { readFileSync } from "node:fs";
import path from "node:path";

import type { MvpCardView } from "@/types/cards";

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

let cachedPayload: TokenMasterPayload | null = null;
let cachedByTokenId: Map<string, TokenMasterRow> | null = null;
let cachedBySlug: Map<string, TokenMasterRow> | null = null;
let cachedBySymbol: Map<string, TokenMasterRow> | null = null;
let cachedByCoingeckoId: Map<string, TokenMasterRow> | null = null;

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

  for (const token of payload.tokens ?? []) {
    cachedByTokenId.set(normalize(token.tokenId), token);
    cachedBySlug.set(normalize(token.slug), token);
    cachedBySymbol.set(normalize(token.symbol), token);
    cachedByCoingeckoId.set(normalize(token.coingeckoId), token);
  }
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
