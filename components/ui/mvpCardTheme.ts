const rarityAccentMap: Record<string, { accent: string; glow: string; border: string; badge: string; foil: string }> = {
  COMMON: {
    accent: "#8A929F",
    glow: "rgba(138, 146, 159, 0.22)",
    border: "rgba(138, 146, 159, 0.38)",
    badge: "rgba(138, 146, 159, 0.24)",
    foil: "linear-gradient(130deg, transparent 12%, rgba(248, 249, 252, 0.08) 47%, transparent 76%)",
  },
  UNCOMMON: {
    accent: "#4FA39A",
    glow: "rgba(79, 163, 154, 0.25)",
    border: "rgba(79, 163, 154, 0.42)",
    badge: "rgba(79, 163, 154, 0.24)",
    foil: "linear-gradient(130deg, transparent 12%, rgba(94, 197, 184, 0.12) 47%, transparent 76%)",
  },
  RARE: {
    accent: "#4A79F6",
    glow: "rgba(74, 121, 246, 0.28)",
    border: "rgba(74, 121, 246, 0.48)",
    badge: "rgba(74, 121, 246, 0.26)",
    foil: "linear-gradient(130deg, transparent 12%, rgba(87, 140, 255, 0.16) 47%, transparent 76%)",
  },
  EPIC: {
    accent: "#7A57DE",
    glow: "rgba(122, 87, 222, 0.34)",
    border: "rgba(122, 87, 222, 0.5)",
    badge: "rgba(122, 87, 222, 0.26)",
    foil: "linear-gradient(130deg, transparent 12%, rgba(164, 118, 255, 0.18) 47%, transparent 76%)",
  },
  LEGENDARY: {
    accent: "#D8A63E",
    glow: "rgba(216, 166, 62, 0.38)",
    border: "rgba(216, 166, 62, 0.56)",
    badge: "rgba(216, 166, 62, 0.28)",
    foil: "linear-gradient(130deg, transparent 12%, rgba(255, 223, 146, 0.24) 47%, transparent 76%)",
  },
};

const editionToneMap: Record<string, { treatment: string; sheen: string; label: string }> = {
  BASE: {
    treatment: "linear-gradient(170deg, rgba(16, 19, 24, 0.96), rgba(8, 9, 12, 0.98))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01) 42%, transparent 100%)",
    label: "Base",
  },
  REVERSE: {
    treatment: "linear-gradient(170deg, rgba(8, 10, 13, 0.98), rgba(19, 24, 30, 0.96))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.08) 40%, transparent 100%)",
    label: "Reverse",
  },
  BRILLANTE: {
    treatment: "linear-gradient(170deg, rgba(15, 17, 21, 0.98), rgba(12, 15, 20, 0.96), rgba(7, 8, 11, 0.99))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04) 42%, transparent 100%)",
    label: "Brillante",
  },
  HOLO: {
    treatment: "linear-gradient(165deg, rgba(12, 14, 18, 0.98), rgba(10, 12, 16, 0.98))",
    sheen: "linear-gradient(120deg, rgba(91, 167, 255, 0.18), rgba(190, 126, 255, 0.16), rgba(107, 255, 211, 0.14))",
    label: "Holo",
  },
  FULL_ART: {
    treatment: "linear-gradient(170deg, rgba(12, 14, 18, 0.96), rgba(8, 9, 11, 0.98))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 48%, transparent 100%)",
    label: "Full Art",
  },
};

const factionAccent: Record<string, string> = {
  NECRO: "#A75CF6",
  AETHER: "#57B0FF",
  SOLAR: "#F0AA57",
  WILD: "#54B587",
  ARCANE: "#8F7EFF",
};

const chainAccent: Record<string, string> = {
  ETHEREUM: "#6C7CFF",
  POLYGON: "#8B5CFF",
  BASE: "#2E6BFF",
  SOLANA: "#39D0C2",
  ARBITRUM: "#59A4FF",
};

const fallbackRarity = rarityAccentMap.COMMON;
const fallbackEdition = editionToneMap.BASE;

const normalize = (value: string | null | undefined) => (value ?? "").trim().toUpperCase();

export const getRarityTheme = (rarity: string) => rarityAccentMap[normalize(rarity)] ?? fallbackRarity;
export const getEditionTheme = (edition: string) => editionToneMap[normalize(edition)] ?? { ...fallbackEdition, label: edition || "Base" };

export const getFactionAccent = (faction: string | null) => factionAccent[normalize(faction)] ?? "#76808F";
export const getChainAccent = (chain: string | null) => chainAccent[normalize(chain)] ?? "#5D708C";

export const prettyEditionLabel = (edition: string) => getEditionTheme(edition).label;
