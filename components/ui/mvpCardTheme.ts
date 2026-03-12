export type RarityTheme = {
  accent: string;
  glow: string;
  border: string;
  edge: string;
  badge: string;
  badgeText: string;
  foil: string;
  frameTop: string;
  frameBottom: string;
  ornament: string;
};

export type EditionTheme = {
  treatment: string;
  sheen: string;
  finish: string;
  artOverlay: string;
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
    edge: "rgba(196, 201, 210, 0.32)",
    badge: "rgba(144, 153, 166, 0.25)",
    badgeText: "#d7dde8",
    foil: "linear-gradient(130deg, transparent 12%, rgba(240, 244, 255, 0.08) 47%, transparent 76%)",
    frameTop: "rgba(196, 201, 210, 0.35)",
    frameBottom: "rgba(93, 101, 112, 0.34)",
    ornament: "rgba(202, 209, 220, 0.24)",
  },
  UNCOMMON: {
    accent: "#4FA39A",
    glow: "rgba(79, 163, 154, 0.24)",
    border: "rgba(79, 163, 154, 0.45)",
    edge: "rgba(126, 212, 201, 0.34)",
    badge: "rgba(79, 163, 154, 0.28)",
    badgeText: "#c6f3ed",
    foil: "linear-gradient(130deg, transparent 12%, rgba(94, 197, 184, 0.13) 47%, transparent 76%)",
    frameTop: "rgba(118, 212, 198, 0.36)",
    frameBottom: "rgba(53, 107, 102, 0.38)",
    ornament: "rgba(106, 218, 202, 0.28)",
  },
  RARE: {
    accent: "#4D7EFF",
    glow: "rgba(77, 126, 255, 0.3)",
    border: "rgba(77, 126, 255, 0.52)",
    edge: "rgba(154, 183, 255, 0.4)",
    badge: "rgba(77, 126, 255, 0.3)",
    badgeText: "#d8e6ff",
    foil: "linear-gradient(130deg, transparent 12%, rgba(117, 164, 255, 0.18) 47%, transparent 76%)",
    frameTop: "rgba(135, 170, 255, 0.42)",
    frameBottom: "rgba(45, 73, 146, 0.42)",
    ornament: "rgba(145, 179, 255, 0.32)",
  },
  EPIC: {
    accent: "#7D5DE4",
    glow: "rgba(125, 93, 228, 0.35)",
    border: "rgba(125, 93, 228, 0.55)",
    edge: "rgba(198, 173, 255, 0.42)",
    badge: "rgba(125, 93, 228, 0.31)",
    badgeText: "#efe2ff",
    foil: "linear-gradient(130deg, transparent 12%, rgba(177, 130, 255, 0.2) 47%, transparent 76%)",
    frameTop: "rgba(186, 150, 255, 0.42)",
    frameBottom: "rgba(81, 56, 145, 0.44)",
    ornament: "rgba(188, 151, 255, 0.34)",
  },
  LEGENDARY: {
    accent: "#D8A63E",
    glow: "rgba(216, 166, 62, 0.4)",
    border: "rgba(216, 166, 62, 0.6)",
    edge: "rgba(255, 227, 165, 0.48)",
    badge: "rgba(216, 166, 62, 0.35)",
    badgeText: "#fff1cf",
    foil: "linear-gradient(130deg, transparent 12%, rgba(255, 222, 145, 0.24) 47%, transparent 76%)",
    frameTop: "rgba(255, 226, 157, 0.48)",
    frameBottom: "rgba(135, 98, 33, 0.48)",
    ornament: "rgba(255, 225, 154, 0.36)",
  },
};

const editionToneMap: Record<string, EditionTheme> = {
  BASE: {
    treatment: "linear-gradient(176deg, rgba(15, 18, 24, 0.98), rgba(8, 10, 14, 0.99))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01) 45%, transparent)",
    finish: "linear-gradient(130deg, transparent 20%, rgba(255,255,255,0.04) 50%, transparent 78%)",
    artOverlay: "linear-gradient(170deg, rgba(13,16,22,0.24), rgba(4,6,9,0.32))",
    label: "Base",
    textBox: "rgba(11, 14, 19, 0.78)",
    footer: "rgba(6, 9, 13, 0.88)",
  },
  REVERSE: {
    treatment: "linear-gradient(176deg, rgba(9, 11, 15, 0.99), rgba(18, 22, 30, 0.98))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.08) 45%, transparent)",
    finish: "linear-gradient(130deg, transparent 15%, rgba(163, 191, 255, 0.08) 48%, transparent 78%)",
    artOverlay: "linear-gradient(170deg, rgba(20,24,33,0.4), rgba(6,9,13,0.24))",
    label: "Reverse",
    textBox: "rgba(13, 17, 24, 0.74)",
    footer: "rgba(5, 7, 10, 0.9)",
  },
  BRILLANTE: {
    treatment: "linear-gradient(176deg, rgba(14, 17, 23, 0.98), rgba(8, 10, 13, 0.99), rgba(16, 18, 24, 0.97))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03) 45%, transparent)",
    finish: "linear-gradient(130deg, transparent 14%, rgba(255,255,255,0.1) 48%, transparent 80%)",
    artOverlay: "linear-gradient(170deg, rgba(30,34,43,0.28), rgba(7,10,15,0.2))",
    label: "Brillante",
    textBox: "rgba(12, 16, 21, 0.76)",
    footer: "rgba(7, 10, 14, 0.9)",
  },
  HOLO: {
    treatment: "linear-gradient(170deg, rgba(13, 16, 22, 0.99), rgba(10, 12, 17, 0.98))",
    sheen: "linear-gradient(115deg, rgba(90, 165, 255, 0.17), rgba(192, 131, 255, 0.17), rgba(108, 255, 214, 0.13))",
    finish: "linear-gradient(120deg, rgba(110,192,255,0.14), rgba(221,170,255,0.12), rgba(146,255,222,0.12))",
    artOverlay: "linear-gradient(170deg, rgba(24,32,45,0.3), rgba(6,9,14,0.12))",
    label: "Holo",
    textBox: "rgba(12, 15, 22, 0.76)",
    footer: "rgba(6, 10, 15, 0.9)",
  },
  FULL_ART: {
    treatment: "linear-gradient(176deg, rgba(14, 16, 21, 0.97), rgba(8, 9, 12, 0.99))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02) 48%, transparent)",
    finish: "linear-gradient(125deg, transparent 16%, rgba(255,255,255,0.08) 47%, transparent 76%)",
    artOverlay: "linear-gradient(170deg, rgba(12,15,22,0.16), rgba(5,8,12,0.1))",
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


export const getRarityOrnament = (rarity: string) => getRarityTheme(rarity).ornament;
