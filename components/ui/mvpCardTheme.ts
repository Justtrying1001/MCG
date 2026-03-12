import type { CSSProperties } from "react";

export type ClaudeRarityCode = "B" | "A" | "S" | "S+";
export type ClaudeEditionCode = "BASE" | "REVERSE" | "BRILLANTE" | "HOLO" | "MCG_ART";

export type RarityTheme = {
  code: ClaudeRarityCode;
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
  editionClass: "ed-base" | "ed-reverse" | "ed-brillante" | "ed-holo" | "ed-mcgart";
  needsReverseLayers: boolean;
  needsBrillanteLayer: boolean;
  needsHoloLayer: boolean;
  needsMcgArtLayer: boolean;
};

const RARITY_THEMES: Record<ClaudeRarityCode, RarityTheme> = {
  B: {
    code: "B",
    accent: "#3d4a5c",
    glowCol: "rgba(61,74,92,0)",
    borderOut: "#181e27",
    borderIn: "#1f2733",
    wire: "rgba(255,255,255,0.05)",
    wireAcc: "rgba(255,255,255,0.07)",
    bgCard: "#11111b",
    bgHeader: "#0d0d16",
    bgFooter: "#0b0b14",
    txtName: "#c8d0dc",
    txtSub: "#2e3848",
    txtFlavor: "#4a5568",
    cornerStroke: "#2a3545",
    cornerDetail: false,
    cornerDot: false,
  },
  A: {
    code: "A",
    accent: "#5a7a8a",
    glowCol: "rgba(90,122,138,0.12)",
    borderOut: "#1e2d38",
    borderIn: "#253545",
    wire: "rgba(90,122,138,0.1)",
    wireAcc: "rgba(90,122,138,0.18)",
    bgCard: "#0f1318",
    bgHeader: "#0c1015",
    bgFooter: "#0a120e",
    txtName: "#d4dde6",
    txtSub: "#3a5060",
    txtFlavor: "#556070",
    cornerStroke: "#3a5060",
    cornerDetail: false,
    cornerDot: false,
  },
  S: {
    code: "S",
    accent: "#7090b8",
    glowCol: "rgba(112,144,184,0.22)",
    borderOut: "#243050",
    borderIn: "#2d3d60",
    wire: "rgba(112,144,184,0.12)",
    wireAcc: "rgba(112,144,184,0.22)",
    bgCard: "#0d1220",
    bgHeader: "#0a0f1a",
    bgFooter: "#090d16",
    txtName: "#dce6f4",
    txtSub: "#4a6080",
    txtFlavor: "#607080",
    cornerStroke: "#4a6888",
    cornerDetail: true,
    cornerDot: false,
  },
  "S+": {
    code: "S+",
    accent: "#b89a60",
    glowCol: "rgba(184,154,96,0.35)",
    borderOut: "#3a2e18",
    borderIn: "#4a3c22",
    wire: "rgba(184,154,96,0.12)",
    wireAcc: "rgba(184,154,96,0.25)",
    bgCard: "#0e0b04",
    bgHeader: "#0b0802",
    bgFooter: "#090703",
    txtName: "#ece0c8",
    txtSub: "#7a6040",
    txtFlavor: "#806a50",
    cornerStroke: "#8a7040",
    cornerDetail: true,
    cornerDot: true,
  },
};

const EDITION_THEMES: Record<ClaudeEditionCode, EditionTheme> = {
  BASE: {
    code: "BASE",
    label: "Base",
    editionClass: "ed-base",
    needsReverseLayers: false,
    needsBrillanteLayer: false,
    needsHoloLayer: false,
    needsMcgArtLayer: false,
  },
  REVERSE: {
    code: "REVERSE",
    label: "Reverse",
    editionClass: "ed-reverse",
    needsReverseLayers: true,
    needsBrillanteLayer: false,
    needsHoloLayer: false,
    needsMcgArtLayer: false,
  },
  BRILLANTE: {
    code: "BRILLANTE",
    label: "Brillante",
    editionClass: "ed-brillante",
    needsReverseLayers: false,
    needsBrillanteLayer: true,
    needsHoloLayer: false,
    needsMcgArtLayer: false,
  },
  HOLO: {
    code: "HOLO",
    label: "Holo",
    editionClass: "ed-holo",
    needsReverseLayers: false,
    needsBrillanteLayer: false,
    needsHoloLayer: true,
    needsMcgArtLayer: false,
  },
  MCG_ART: {
    code: "MCG_ART",
    label: "MCG Art",
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
    EPIC: "S",
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
