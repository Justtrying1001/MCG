export type RarityTheme = {
  accent: string;
  glow: string;
  border: string;
  badge: string;
  foil: string;
  frameTop: string;
  frameBottom: string;
};

export type EditionTheme = {
  treatment: string;
  sheen: string;
  label: string;
  textBox: string;
  footer: string;
};

export type CardFrameTheme = {
  shell: string;
  inner: string;
  divider: string;
};

const rarityAccentMap: Record<string, RarityTheme> = {
  COMMON: {
    accent: "#9099A6",
    glow: "rgba(144, 153, 166, 0.2)",
    border: "rgba(144, 153, 166, 0.4)",
    badge: "rgba(144, 153, 166, 0.25)",
    foil: "linear-gradient(130deg, transparent 12%, rgba(240, 244, 255, 0.08) 47%, transparent 76%)",
    frameTop: "rgba(196, 201, 210, 0.35)",
    frameBottom: "rgba(93, 101, 112, 0.34)",
  },
  UNCOMMON: {
    accent: "#4FA39A",
    glow: "rgba(79, 163, 154, 0.24)",
    border: "rgba(79, 163, 154, 0.45)",
    badge: "rgba(79, 163, 154, 0.28)",
    foil: "linear-gradient(130deg, transparent 12%, rgba(94, 197, 184, 0.13) 47%, transparent 76%)",
    frameTop: "rgba(118, 212, 198, 0.36)",
    frameBottom: "rgba(53, 107, 102, 0.38)",
  },
  RARE: {
    accent: "#4D7EFF",
    glow: "rgba(77, 126, 255, 0.3)",
    border: "rgba(77, 126, 255, 0.52)",
    badge: "rgba(77, 126, 255, 0.3)",
    foil: "linear-gradient(130deg, transparent 12%, rgba(117, 164, 255, 0.18) 47%, transparent 76%)",
    frameTop: "rgba(135, 170, 255, 0.42)",
    frameBottom: "rgba(45, 73, 146, 0.42)",
  },
  EPIC: {
    accent: "#7D5DE4",
    glow: "rgba(125, 93, 228, 0.35)",
    border: "rgba(125, 93, 228, 0.55)",
    badge: "rgba(125, 93, 228, 0.31)",
    foil: "linear-gradient(130deg, transparent 12%, rgba(177, 130, 255, 0.2) 47%, transparent 76%)",
    frameTop: "rgba(186, 150, 255, 0.42)",
    frameBottom: "rgba(81, 56, 145, 0.44)",
  },
  LEGENDARY: {
    accent: "#D8A63E",
    glow: "rgba(216, 166, 62, 0.4)",
    border: "rgba(216, 166, 62, 0.6)",
    badge: "rgba(216, 166, 62, 0.35)",
    foil: "linear-gradient(130deg, transparent 12%, rgba(255, 222, 145, 0.24) 47%, transparent 76%)",
    frameTop: "rgba(255, 226, 157, 0.48)",
    frameBottom: "rgba(135, 98, 33, 0.48)",
  },
};

const editionToneMap: Record<string, EditionTheme> = {
  BASE: {
    treatment: "linear-gradient(176deg, rgba(15, 18, 24, 0.98), rgba(8, 10, 14, 0.99))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01) 45%, transparent)",
    label: "Base",
    textBox: "rgba(11, 14, 19, 0.78)",
    footer: "rgba(6, 9, 13, 0.88)",
  },
  REVERSE: {
    treatment: "linear-gradient(176deg, rgba(9, 11, 15, 0.99), rgba(18, 22, 30, 0.98))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.08) 45%, transparent)",
    label: "Reverse",
    textBox: "rgba(13, 17, 24, 0.74)",
    footer: "rgba(5, 7, 10, 0.9)",
  },
  BRILLANTE: {
    treatment: "linear-gradient(176deg, rgba(14, 17, 23, 0.98), rgba(8, 10, 13, 0.99), rgba(16, 18, 24, 0.97))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03) 45%, transparent)",
    label: "Brillante",
    textBox: "rgba(12, 16, 21, 0.76)",
    footer: "rgba(7, 10, 14, 0.9)",
  },
  HOLO: {
    treatment: "linear-gradient(170deg, rgba(13, 16, 22, 0.99), rgba(10, 12, 17, 0.98))",
    sheen: "linear-gradient(115deg, rgba(90, 165, 255, 0.17), rgba(192, 131, 255, 0.17), rgba(108, 255, 214, 0.13))",
    label: "Holo",
    textBox: "rgba(12, 15, 22, 0.76)",
    footer: "rgba(6, 10, 15, 0.9)",
  },
  FULL_ART: {
    treatment: "linear-gradient(176deg, rgba(14, 16, 21, 0.97), rgba(8, 9, 12, 0.99))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02) 48%, transparent)",
    label: "Full Art",
    textBox: "rgba(10, 13, 18, 0.72)",
    footer: "rgba(5, 8, 12, 0.88)",
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

const normalize = (value: string | null | undefined) => (value ?? "").trim().toUpperCase();

const fallbackRarity = rarityAccentMap.COMMON;
const fallbackEdition = editionToneMap.BASE;

export const getRarityTheme = (rarity: string): RarityTheme => rarityAccentMap[normalize(rarity)] ?? fallbackRarity;

export const getEditionTheme = (edition: string): EditionTheme => {
  const normalized = normalize(edition);
  return editionToneMap[normalized] ?? { ...fallbackEdition, label: edition || "Base" };
};

export const getCardFrameTheme = (rarity: string, edition: string): CardFrameTheme => {
  const rarityTheme = getRarityTheme(rarity);
  const editionTheme = getEditionTheme(edition);
  return {
    shell: `linear-gradient(180deg, ${rarityTheme.frameTop}, ${rarityTheme.frameBottom})`,
    inner: editionTheme.textBox,
    divider: `color-mix(in oklab, ${rarityTheme.accent} 60%, rgba(255,255,255,0.38))`,
  };
};

export const getFactionAccent = (faction: string | null) => factionAccent[normalize(faction)] ?? "#76808F";
export const getChainAccent = (chain: string | null) => chainAccent[normalize(chain)] ?? "#5D708C";
export const prettyEditionLabel = (edition: string) => getEditionTheme(edition).label;
