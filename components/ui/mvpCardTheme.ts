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
    accent: "#5D4B33",
    glowCol: "rgba(93,75,51,0.0)",
    borderOut: "#2A2A2A",
    borderIn: "#C9C1B3",
    wire: "rgba(93,75,51,0.16)",
    wireAcc: "rgba(93,75,51,0.3)",
    bgCard: "#F4F1EA",
    bgHeader: "#E7DFC7",
    bgFooter: "#DDD1B5",
    txtName: "#1A1A1A",
    txtSub: "#5C5142",
    txtFlavor: "#262626",
    cornerStroke: "#5D4B33",
    cornerDetail: false,
    cornerDot: false,
  },
  A: {
    code: "A",
    label: "Uncommon",
    accent: "#2F7A63",
    glowCol: "rgba(47,122,99,0.0)",
    borderOut: "#2A2A2A",
    borderIn: "#BFD0C6",
    wire: "rgba(47,122,99,0.16)",
    wireAcc: "rgba(47,122,99,0.3)",
    bgCard: "#EEF5EE",
    bgHeader: "#D7E8D9",
    bgFooter: "#C4D9C8",
    txtName: "#10231B",
    txtSub: "#476257",
    txtFlavor: "#1E2A25",
    cornerStroke: "#2F7A63",
    cornerDetail: false,
    cornerDot: false,
  },
  S: {
    code: "S",
    label: "Rare",
    accent: "#2E6DD8",
    glowCol: "rgba(46,109,216,0.0)",
    borderOut: "#2A2A2A",
    borderIn: "#B9C9EA",
    wire: "rgba(46,109,216,0.18)",
    wireAcc: "rgba(46,109,216,0.34)",
    bgCard: "#EEF4FF",
    bgHeader: "#D7E4FF",
    bgFooter: "#C4D4F2",
    txtName: "#10203C",
    txtSub: "#475D85",
    txtFlavor: "#1D2736",
    cornerStroke: "#2E6DD8",
    cornerDetail: true,
    cornerDot: false,
  },
  E: {
    code: "E",
    label: "Epic",
    accent: "#7A3FD9",
    glowCol: "rgba(122,63,217,0.0)",
    borderOut: "#2A2A2A",
    borderIn: "#D1C0EE",
    wire: "rgba(122,63,217,0.18)",
    wireAcc: "rgba(122,63,217,0.34)",
    bgCard: "#F5EEFF",
    bgHeader: "#E7D9FB",
    bgFooter: "#D6C6EE",
    txtName: "#27143F",
    txtSub: "#6B5091",
    txtFlavor: "#2A2234",
    cornerStroke: "#7A3FD9",
    cornerDetail: true,
    cornerDot: true,
  },
  "S+": {
    code: "S+",
    label: "Legendary",
    accent: "#C8921C",
    glowCol: "rgba(200,146,28,0.0)",
    borderOut: "#2A2A2A",
    borderIn: "#E7D4A1",
    wire: "rgba(200,146,28,0.18)",
    wireAcc: "rgba(200,146,28,0.36)",
    bgCard: "#FFF7E7",
    bgHeader: "#F6E3B7",
    bgFooter: "#E8D099",
    txtName: "#392709",
    txtSub: "#7D5C1B",
    txtFlavor: "#35291A",
    cornerStroke: "#C8921C",
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
