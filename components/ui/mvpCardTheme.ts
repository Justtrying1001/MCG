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

const BASE_SURFACE = {
  bgCard: "#F2EDE3",
  bgHeader: "#E6DFD2",
  bgFooter: "#E0D8C8",
  txtName: "#1A1A1A",
  txtSub: "#6B6B6B",
  txtFlavor: "#2A2A2A",
};

const RARITY_THEMES: Record<ClaudeRarityCode, RarityTheme> = {
  B: {
    code: "B",
    label: "Common",
    accent: "#4B4B4B",
    glowCol: "rgba(0,0,0,0)",
    borderOut: "#2A2A2A",
    borderIn: "#B8B2A7",
    wire: "rgba(42,42,42,0.12)",
    wireAcc: "rgba(42,42,42,0.22)",
    ...BASE_SURFACE,
    cornerStroke: "#4B4B4B",
    cornerDetail: false,
    cornerDot: false,
  },
  A: {
    code: "A",
    label: "Uncommon",
    accent: "#48614C",
    glowCol: "rgba(72,97,76,0.08)",
    borderOut: "#2A2A2A",
    borderIn: "#B8B2A7",
    wire: "rgba(72,97,76,0.12)",
    wireAcc: "rgba(72,97,76,0.22)",
    ...BASE_SURFACE,
    cornerStroke: "#48614C",
    cornerDetail: false,
    cornerDot: false,
  },
  S: {
    code: "S",
    label: "Rare",
    accent: "#496C9A",
    glowCol: "rgba(73,108,154,0.12)",
    borderOut: "#2A2A2A",
    borderIn: "#B8B2A7",
    wire: "rgba(73,108,154,0.14)",
    wireAcc: "rgba(73,108,154,0.26)",
    ...BASE_SURFACE,
    cornerStroke: "#496C9A",
    cornerDetail: true,
    cornerDot: false,
  },
  E: {
    code: "E",
    label: "Epic",
    accent: "#7A56A3",
    glowCol: "rgba(122,86,163,0.12)",
    borderOut: "#2A2A2A",
    borderIn: "#B8B2A7",
    wire: "rgba(122,86,163,0.14)",
    wireAcc: "rgba(122,86,163,0.26)",
    ...BASE_SURFACE,
    cornerStroke: "#7A56A3",
    cornerDetail: true,
    cornerDot: true,
  },
  "S+": {
    code: "S+",
    label: "Legendary",
    accent: "#A8822A",
    glowCol: "rgba(168,130,42,0.14)",
    borderOut: "#2A2A2A",
    borderIn: "#B8B2A7",
    wire: "rgba(168,130,42,0.14)",
    wireAcc: "rgba(168,130,42,0.3)",
    ...BASE_SURFACE,
    cornerStroke: "#A8822A",
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
