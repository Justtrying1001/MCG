import type { CSSProperties } from "react";

export type ClaudeRarityCode = "B" | "A" | "S" | "E" | "S+";
export type ClaudeEditionCode = "BASE" | "REVERSE" | "BRILLANTE" | "HOLO" | "MCG_ART";

export type RarityTheme = {
  code: ClaudeRarityCode;
  label: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  accent: string;
  glowCol: string;
  borderOut: string;
  borderIn: string;
  wire: string;
  wireAcc: string;
  bgCard: string;
  bgHeader: string;
  bgFooter: string;
  txtName: string;
  txtSub: string;
  txtFlavor: string;
  cornerStroke: string;
  cornerDetail: boolean;
  cornerDot: boolean;
};

export type EditionTheme = {
  code: ClaudeEditionCode;
  label: string;
  badgeLabel: string;
  editionClass: "ed-base" | "ed-reverse" | "ed-brillante" | "ed-holo" | "ed-mcgart";
  needsReverseLayers: boolean;
  needsBrillanteLayer: boolean;
  needsHoloLayer: boolean;
  needsMcgArtLayer: boolean;
};

const RARITY_THEMES: Record<ClaudeRarityCode, RarityTheme> = {
  B: {
    code: "B",
    label: "Common",
    accent: "#6f5c47",
    glowCol: "rgba(111,92,71,0.12)",
    borderOut: "#3e2f22",
    borderIn: "#b59b7a",
    wire: "rgba(74,55,37,0.34)",
    wireAcc: "rgba(111,92,71,0.5)",
    bgCard: "#d8c29b",
    bgHeader: "#e7d6b4",
    bgFooter: "#c5ab80",
    txtName: "#24170d",
    txtSub: "#4d3726",
    txtFlavor: "#3f2e21",
    cornerStroke: "#6f5c47",
    cornerDetail: false,
    cornerDot: false,
  },
  A: {
    code: "A",
    label: "Uncommon",
    accent: "#45624d",
    glowCol: "rgba(69,98,77,0.16)",
    borderOut: "#213528",
    borderIn: "#8fb091",
    wire: "rgba(38,62,45,0.34)",
    wireAcc: "rgba(73,117,84,0.54)",
    bgCard: "#c8d1b2",
    bgHeader: "#dde6cd",
    bgFooter: "#aab58e",
    txtName: "#132016",
    txtSub: "#304433",
    txtFlavor: "#28372b",
    cornerStroke: "#45624d",
    cornerDetail: false,
    cornerDot: false,
  },
  S: {
    code: "S",
    label: "Rare",
    accent: "#395b89",
    glowCol: "rgba(57,91,137,0.2)",
    borderOut: "#1b3151",
    borderIn: "#88a9d3",
    wire: "rgba(28,54,92,0.34)",
    wireAcc: "rgba(63,108,176,0.58)",
    bgCard: "#c6d5ea",
    bgHeader: "#dfe9f8",
    bgFooter: "#9eb7d8",
    txtName: "#0f1e33",
    txtSub: "#294567",
    txtFlavor: "#223a56",
    cornerStroke: "#395b89",
    cornerDetail: true,
    cornerDot: false,
  },
  E: {
    code: "E",
    label: "Epic",
    accent: "#6e3c85",
    glowCol: "rgba(110,60,133,0.22)",
    borderOut: "#3d1d4d",
    borderIn: "#c498d0",
    wire: "rgba(63,28,80,0.36)",
    wireAcc: "rgba(117,64,145,0.6)",
    bgCard: "#dcc5e6",
    bgHeader: "#efdcf4",
    bgFooter: "#b892c6",
    txtName: "#23102c",
    txtSub: "#532b67",
    txtFlavor: "#432353",
    cornerStroke: "#6e3c85",
    cornerDetail: true,
    cornerDot: true,
  },
  "S+": {
    code: "S+",
    label: "Legendary",
    accent: "#9a6b12",
    glowCol: "rgba(154,107,18,0.26)",
    borderOut: "#593b00",
    borderIn: "#efc76e",
    wire: "rgba(97,64,0,0.38)",
    wireAcc: "rgba(177,124,18,0.64)",
    bgCard: "#ead089",
    bgHeader: "#f8e6b0",
    bgFooter: "#d5ad4b",
    txtName: "#2f1e00",
    txtSub: "#644308",
    txtFlavor: "#513705",
    cornerStroke: "#9a6b12",
    cornerDetail: true,
    cornerDot: true,
  },
};

const EDITION_THEMES: Record<ClaudeEditionCode, EditionTheme> = {
  BASE: {
    code: "BASE",
    label: "Base",
    badgeLabel: "BASE",
    editionClass: "ed-base",
    needsReverseLayers: false,
    needsBrillanteLayer: false,
    needsHoloLayer: false,
    needsMcgArtLayer: false,
  },
  REVERSE: {
    code: "REVERSE",
    label: "Reverse",
    badgeLabel: "REVERSE",
    editionClass: "ed-reverse",
    needsReverseLayers: true,
    needsBrillanteLayer: false,
    needsHoloLayer: false,
    needsMcgArtLayer: false,
  },
  BRILLANTE: {
    code: "BRILLANTE",
    label: "Brillante",
    badgeLabel: "BRILLIANT",
    editionClass: "ed-brillante",
    needsReverseLayers: false,
    needsBrillanteLayer: true,
    needsHoloLayer: false,
    needsMcgArtLayer: false,
  },
  HOLO: {
    code: "HOLO",
    label: "Holo",
    badgeLabel: "HOLO",
    editionClass: "ed-holo",
    needsReverseLayers: false,
    needsBrillanteLayer: false,
    needsHoloLayer: true,
    needsMcgArtLayer: false,
  },
  MCG_ART: {
    code: "MCG_ART",
    label: "MCG Art",
    badgeLabel: "MCG ART",
    editionClass: "ed-mcgart",
    needsReverseLayers: false,
    needsBrillanteLayer: false,
    needsHoloLayer: false,
    needsMcgArtLayer: true,
  },
};

const normalize = (value: string | null | undefined) => (value ?? "").trim().toUpperCase();

export const resolveRarity = (rarity: string): ClaudeRarityCode => {
  const normalized = normalize(rarity);
  const map: Record<string, ClaudeRarityCode> = {
    B: "B",
    COMMON: "B",
    A: "A",
    UNCOMMON: "A",
    S: "S",
    RARE: "S",
    E: "E",
    EPIC: "E",
    "S+": "S+",
    LEGENDARY: "S+",
  };

  return map[normalized] ?? "B";
};

export const resolveEdition = (edition: string): ClaudeEditionCode => {
  const normalized = normalize(edition);
  const map: Record<string, ClaudeEditionCode> = {
    BASE: "BASE",
    STANDARD: "BASE",
    REVERSE: "REVERSE",
    BRILLANTE: "BRILLANTE",
    HOLO: "HOLO",
    HOLOGRAPHIC: "HOLO",
    HOLOGRAPHIQUE: "HOLO",
    FULL_ART: "MCG_ART",
    MCG_ART: "MCG_ART",
  };

  return map[normalized] ?? "BASE";
};

export const getRarityTheme = (rarity: string): RarityTheme => RARITY_THEMES[resolveRarity(rarity)];

export const getEditionTheme = (edition: string): EditionTheme => EDITION_THEMES[resolveEdition(edition)];

export const getRarityVars = (theme: RarityTheme): CSSProperties =>
  ({
    "--accent": theme.accent,
    "--glow-col": theme.glowCol,
    "--border-out": theme.borderOut,
    "--border-in": theme.borderIn,
    "--wire": theme.wire,
    "--wire-acc": theme.wireAcc,
    "--bg-card": theme.bgCard,
    "--bg-header": theme.bgHeader,
    "--bg-footer": theme.bgFooter,
    "--txt-name": theme.txtName,
    "--txt-sub": theme.txtSub,
    "--txt-flavor": theme.txtFlavor,
  }) as CSSProperties;

export const prettyEditionLabel = (edition: string) => getEditionTheme(edition).label;
