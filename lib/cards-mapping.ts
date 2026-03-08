import type { BaseCardArchetype, BaseCardFinish, BaseCardRarity } from "@/types/cards";

const BASE_RARITY_BY_PROJECT_TIER: Record<string, BaseCardRarity> = {
  S: "legendary",
  A: "epic",
  B: "rare",
  C: "common",
  D: "common",
};

const FINISH_BY_VARIANT_TYPE: Record<string, BaseCardFinish> = {
  standard: "standard",
  holo: "holo",
  full_art: "full_art",
  glitch: "glitch",
  gold: "gold",
};

const RARITY_CODE: Record<BaseCardRarity, string> = {
  common: "COM",
  rare: "RAR",
  epic: "EPC",
  legendary: "LEG",
};

export function mapBaseRarityFromProjectTier(projectTier?: string): BaseCardRarity {
  if (!projectTier) return "common";
  return BASE_RARITY_BY_PROJECT_TIER[projectTier] ?? "common";
}

export function mapFinishFromVariantType(variantType?: string): BaseCardFinish {
  if (!variantType) return "standard";
  return FINISH_BY_VARIANT_TYPE[variantType] ?? "standard";
}

export function computeCombatScore(stats: { ATK: number; DEF: number; SPD: number; CTRL: number }) {
  const weighted =
    stats.ATK * 0.34 +
    stats.DEF * 0.27 +
    stats.SPD * 0.21 +
    stats.CTRL * 0.18;
  return Math.max(0, Math.min(100, Math.round(weighted)));
}

const ARCHETYPE_PAIR: Record<string, BaseCardArchetype> = {
  "ATK+DEF": "bruiser",
  "DEF+ATK": "bruiser",
  "ATK+SPD": "striker",
  "SPD+ATK": "striker",
  "CTRL+DEF": "controller",
  "DEF+CTRL": "controller",
  "SPD+CTRL": "tempo",
  "CTRL+SPD": "tempo",
};

export function computeArchetype(stats: { ATK: number; DEF: number; SPD: number; CTRL: number }): BaseCardArchetype {
  const entries = [
    ["ATK", stats.ATK],
    ["DEF", stats.DEF],
    ["SPD", stats.SPD],
    ["CTRL", stats.CTRL],
  ] as const;

  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const spread = sorted[0][1] - sorted[3][1];

  if (spread <= 8) return "balanced";

  const pairKey = `${sorted[0][0]}+${sorted[1][0]}`;
  return ARCHETYPE_PAIR[pairKey] ?? "balanced";
}

function shortDeterministicCode(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return String(hash % 10000).padStart(4, "0");
}

export function buildCollectorId(input: {
  baseCardId: string;
  baseRarity: BaseCardRarity;
  marketCapRank: number | null;
}) {
  const serial =
    typeof input.marketCapRank === "number" && Number.isFinite(input.marketCapRank)
      ? String(Math.max(1, Math.trunc(input.marketCapRank))).padStart(5, "0")
      : shortDeterministicCode(input.baseCardId);

  return `GEN1-${RARITY_CODE[input.baseRarity]}-${serial}`;
}
