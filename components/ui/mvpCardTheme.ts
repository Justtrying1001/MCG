export type RarityTheme = {
  accent: string;
  glow: string;
  border: string;
  badge: string;
  foil: string;
  frameTop: string;
  frameBottom: string;
  ornament: string;
};

export type EditionTheme = {
  treatment: string;
  sheen: string;
  label: string;
  textBox: string;
  footer: string;
  frameTint: string;
  dividerMix: number;
  artTreatment: string;
  foilOverlay: string;
  glossOpacity: number;
  artScale: number;
  badgeTint: string;
};

export type CardFrameTheme = {
  shell: string;
  inner: string;
  divider: string;
};

export const MVP_CARD_RATIO = 63 / 88;

export type CardSizePreset = {
  minWidth: string;
  maxWidth: string;
  artScaleBoost: number;
  templateRows: string;
  templateGap: string;
};

const cardSizePresets: Record<"collection" | "reveal", CardSizePreset> = {
  collection: {
    minWidth: "164px",
    maxWidth: "198px",
    artScaleBoost: 1,
    templateRows: "18% 47% 20% 15%",
    templateGap: "clamp(0.34rem, 0.58vw, 0.52rem)",
  },
  reveal: {
    minWidth: "188px",
    maxWidth: "232px",
    artScaleBoost: 1.08,
    templateRows: "17% 49% 19% 15%",
    templateGap: "clamp(0.38rem, 0.66vw, 0.56rem)",
  },
};

const rarityAccentMap: Record<string, RarityTheme> = {
  COMMON: {
    accent: "#8E96A3",
    glow: "rgba(142, 150, 163, 0.12)",
    border: "rgba(152, 161, 176, 0.28)",
    badge: "rgba(142, 150, 163, 0.17)",
    foil: "linear-gradient(135deg, transparent 15%, rgba(240, 245, 255, 0.03) 48%, transparent 82%)",
    frameTop: "rgba(186, 193, 205, 0.28)",
    frameBottom: "rgba(83, 91, 102, 0.28)",
    ornament: "rgba(191, 198, 210, 0.18)",
  },
  UNCOMMON: {
    accent: "#6EA99F",
    glow: "rgba(110, 169, 159, 0.14)",
    border: "rgba(112, 172, 162, 0.3)",
    badge: "rgba(110, 169, 159, 0.2)",
    foil: "linear-gradient(135deg, transparent 14%, rgba(140, 213, 200, 0.05) 48%, transparent 82%)",
    frameTop: "rgba(159, 218, 208, 0.31)",
    frameBottom: "rgba(58, 103, 98, 0.31)",
    ornament: "rgba(153, 217, 206, 0.2)",
  },
  RARE: {
    accent: "#6D8FD6",
    glow: "rgba(109, 143, 214, 0.17)",
    border: "rgba(113, 145, 212, 0.33)",
    badge: "rgba(109, 143, 214, 0.22)",
    foil: "linear-gradient(135deg, transparent 14%, rgba(152, 184, 255, 0.07) 48%, transparent 82%)",
    frameTop: "rgba(161, 188, 242, 0.34)",
    frameBottom: "rgba(61, 83, 126, 0.33)",
    ornament: "rgba(157, 184, 237, 0.24)",
  },
  EPIC: {
    accent: "#9279C8",
    glow: "rgba(146, 121, 200, 0.2)",
    border: "rgba(148, 122, 201, 0.36)",
    badge: "rgba(146, 121, 200, 0.24)",
    foil: "linear-gradient(135deg, transparent 14%, rgba(191, 156, 255, 0.08) 48%, transparent 82%)",
    frameTop: "rgba(196, 171, 245, 0.35)",
    frameBottom: "rgba(88, 68, 130, 0.35)",
    ornament: "rgba(196, 172, 243, 0.26)",
  },
  LEGENDARY: {
    accent: "#C4A268",
    glow: "rgba(196, 162, 104, 0.22)",
    border: "rgba(198, 164, 107, 0.39)",
    badge: "rgba(196, 162, 104, 0.27)",
    foil: "linear-gradient(135deg, transparent 13%, rgba(245, 222, 173, 0.1) 48%, transparent 82%)",
    frameTop: "rgba(233, 205, 151, 0.39)",
    frameBottom: "rgba(118, 91, 47, 0.36)",
    ornament: "rgba(239, 214, 167, 0.28)",
  },
};

const editionToneMap: Record<string, EditionTheme> = {
  BASE: {
    treatment: "linear-gradient(176deg, rgba(15, 18, 24, 0.98), rgba(8, 10, 14, 0.99))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.01) 42%, transparent)",
    label: "Base",
    textBox: "rgba(11, 14, 19, 0.78)",
    footer: "rgba(6, 9, 13, 0.88)",
    frameTint: "rgba(255,255,255,0.18)",
    dividerMix: 58,
    artTreatment: "radial-gradient(circle at 36% 32%, rgba(255,255,255,0.06), transparent 58%), linear-gradient(168deg, rgba(7, 10, 15, 0.95), rgba(10, 14, 20, 0.9))",
    foilOverlay: "linear-gradient(128deg, transparent 0%, rgba(255,255,255,0.04) 42%, transparent 78%)",
    glossOpacity: 0.56,
    artScale: 1,
    badgeTint: "rgba(255,255,255,0.12)",
  },
  REVERSE: {
    treatment: "linear-gradient(178deg, rgba(10, 12, 17, 0.99), rgba(21, 26, 35, 0.97))",
    sheen: "linear-gradient(0deg, rgba(255,255,255,0.08), rgba(255,255,255,0.015) 48%, transparent)",
    label: "Reverse",
    textBox: "rgba(13, 18, 25, 0.8)",
    footer: "rgba(7, 10, 15, 0.9)",
    frameTint: "rgba(165, 188, 225, 0.22)",
    dividerMix: 52,
    artTreatment: "radial-gradient(circle at 62% 70%, rgba(255,255,255,0.06), transparent 58%), linear-gradient(168deg, rgba(9, 12, 18, 0.95), rgba(13, 17, 24, 0.9))",
    foilOverlay: "linear-gradient(44deg, transparent 8%, rgba(188, 210, 240, 0.06) 46%, transparent 84%)",
    glossOpacity: 0.64,
    artScale: 1,
    badgeTint: "rgba(165, 188, 225, 0.18)",
  },
  BRILLANTE: {
    treatment: "linear-gradient(176deg, rgba(15, 18, 24, 0.98), rgba(10, 13, 18, 0.99), rgba(17, 20, 26, 0.98))",
    sheen: "linear-gradient(156deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03) 45%, transparent)",
    label: "Brillante",
    textBox: "rgba(12, 16, 22, 0.76)",
    footer: "rgba(8, 11, 16, 0.9)",
    frameTint: "rgba(220, 226, 238, 0.24)",
    dividerMix: 48,
    artTreatment: "radial-gradient(circle at 32% 24%, rgba(255,255,255,0.12), transparent 52%), linear-gradient(168deg, rgba(8, 11, 16, 0.93), rgba(13, 17, 24, 0.9))",
    foilOverlay: "linear-gradient(132deg, transparent 6%, rgba(255,255,255,0.11) 44%, transparent 82%)",
    glossOpacity: 0.76,
    artScale: 1.02,
    badgeTint: "rgba(230, 236, 245, 0.22)",
  },
  HOLO: {
    treatment: "linear-gradient(170deg, rgba(13, 16, 22, 0.99), rgba(9, 12, 17, 0.99))",
    sheen: "linear-gradient(120deg, rgba(114, 174, 255, 0.17), rgba(200, 153, 245, 0.15), rgba(136, 240, 210, 0.13))",
    label: "Holo",
    textBox: "rgba(12, 16, 22, 0.77)",
    footer: "rgba(7, 10, 16, 0.9)",
    frameTint: "rgba(168, 194, 255, 0.26)",
    dividerMix: 44,
    artTreatment: "radial-gradient(circle at 72% 24%, rgba(156, 202, 255, 0.16), transparent 52%), radial-gradient(circle at 36% 72%, rgba(203, 159, 255, 0.12), transparent 54%), linear-gradient(168deg, rgba(8, 11, 17, 0.94), rgba(13, 17, 24, 0.9))",
    foilOverlay: "linear-gradient(122deg, transparent 0%, rgba(137, 188, 255, 0.1) 34%, rgba(205, 166, 250, 0.08) 55%, transparent 88%)",
    glossOpacity: 0.7,
    artScale: 1.03,
    badgeTint: "rgba(175, 197, 255, 0.22)",
  },
  FULL_ART: {
    treatment: "linear-gradient(176deg, rgba(14, 16, 21, 0.97), rgba(8, 9, 12, 0.99))",
    sheen: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.015) 48%, transparent)",
    label: "Full Art",
    textBox: "rgba(9, 12, 17, 0.66)",
    footer: "rgba(5, 8, 12, 0.8)",
    frameTint: "rgba(255,255,255,0.14)",
    dividerMix: 38,
    artTreatment: "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.15), transparent 56%), linear-gradient(168deg, rgba(7, 10, 15, 0.9), rgba(10, 14, 20, 0.84))",
    foilOverlay: "linear-gradient(132deg, transparent 10%, rgba(255,255,255,0.09) 50%, transparent 88%)",
    glossOpacity: 0.66,
    artScale: 1.08,
    badgeTint: "rgba(255,255,255,0.18)",
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

export const getEditionThemeKey = (edition: string) => normalize(edition).toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const getCardFrameTheme = (rarity: string, edition: string): CardFrameTheme => {
  const rarityTheme = getRarityTheme(rarity);
  const editionTheme = getEditionTheme(edition);
  return {
    shell: `linear-gradient(180deg, color-mix(in oklab, ${rarityTheme.frameTop} 78%, ${editionTheme.frameTint}), color-mix(in oklab, ${rarityTheme.frameBottom} 82%, rgba(0,0,0,0.3)))`,
    inner: editionTheme.textBox,
    divider: `color-mix(in oklab, ${rarityTheme.accent} ${editionTheme.dividerMix}%, rgba(255,255,255,0.34))`,
  };
};

export const getFactionAccent = (faction: string | null) => factionAccent[normalize(faction)] ?? "#76808F";
export const getChainAccent = (chain: string | null) => chainAccent[normalize(chain)] ?? "#5D708C";
export const prettyEditionLabel = (edition: string) => getEditionTheme(edition).label;
export const getRarityOrnament = (rarity: string) => getRarityTheme(rarity).ornament;


export const getCardSizePreset = (size: "collection" | "reveal"): CardSizePreset => cardSizePresets[size];
