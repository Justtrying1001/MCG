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
    accent: "#8a8f97",
    glowCol: "rgba(95, 100, 110, 0.14)",
    borderOut: "#3f434a",
    borderIn: "#5b6169",
    wire: "rgba(255, 255, 255, 0.16)",
    wireAcc: "rgba(255, 255, 255, 0.26)",
    bgCard: "#2b2d31",
    bgHeader: "#33363b",
    bgFooter: "#26282d",
    txtName: "#f5f1ea",
    txtSub: "#c7beb1",
    txtFlavor: "#d9d0c3",
    cornerStroke: "#a6acb4",
    cornerDetail: false,
    cornerDot: false,
  },
  A: {
    code: "A",
    label: "Uncommon",
    accent: "#62907f",
    glowCol: "rgba(98, 144, 127, 0.2)",
    borderOut: "#365046",
    borderIn: "#557666",
    wire: "rgba(207, 240, 224, 0.14)",
    wireAcc: "rgba(205, 240, 224, 0.28)",
    bgCard: "#23312d",
    bgHeader: "#283a34",
    bgFooter: "#1f2b27",
    txtName: "#f2efe6",
    txtSub: "#bfd3c8",
    txtFlavor: "#d2e1d7",
    cornerStroke: "#9fc3b4",
    cornerDetail: false,
    cornerDot: false,
  },
  S: {
    code: "S",
    label: "Rare",
    accent: "#708dc9",
    glowCol: "rgba(112, 141, 201, 0.26)",
    borderOut: "#2f3f63",
    borderIn: "#4d6294",
    wire: "rgba(204, 220, 255, 0.17)",
    wireAcc: "rgba(204, 220, 255, 0.3)",
    bgCard: "#202a42",
    bgHeader: "#26314d",
    bgFooter: "#1a2237",
    txtName: "#f3f1ea",
    txtSub: "#cad7f2",
    txtFlavor: "#dde6f8",
    cornerStroke: "#adc0e6",
    cornerDetail: true,
    cornerDot: false,
  },
  E: {
    code: "E",
    label: "Epic",
    accent: "#8f73cf",
    glowCol: "rgba(143, 115, 207, 0.34)",
    borderOut: "#3d2f66",
    borderIn: "#644f95",
    wire: "rgba(222, 207, 255, 0.18)",
    wireAcc: "rgba(228, 216, 255, 0.33)",
    bgCard: "#2a2140",
    bgHeader: "#32274d",
    bgFooter: "#211936",
    txtName: "#f4f0e9",
    txtSub: "#d4c4f3",
    txtFlavor: "#e2d8f7",
    cornerStroke: "#c3ade8",
    cornerDetail: true,
    cornerDot: true,
  },
  "S+": {
    code: "S+",
    label: "Legendary",
    accent: "#b99d63",
    glowCol: "rgba(185, 157, 99, 0.42)",
    borderOut: "#554224",
    borderIn: "#7a6238",
    wire: "rgba(255, 236, 196, 0.17)",
    wireAcc: "rgba(255, 235, 184, 0.35)",
    bgCard: "#3a2d16",
    bgHeader: "#49371c",
    bgFooter: "#2f230f",
    txtName: "#f6f1e7",
    txtSub: "#e4d0a4",
    txtFlavor: "#efe1be",
    cornerStroke: "#dec48f",
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
