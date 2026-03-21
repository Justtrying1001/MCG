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
    accent: "#8e7560",
    glowCol: "rgba(142,117,96,0.10)",
    borderOut: "#8d775f",
    borderIn: "#ceb79a",
    wire: "rgba(118,86,60,0.18)",
    wireAcc: "rgba(160,122,90,0.30)",
    bgCard: "#eadfcb",
    bgHeader: "#f5ecdc",
    bgFooter: "#e0d2bc",
    txtName: "#36261a",
    txtSub: "#755841",
    txtFlavor: "#5f4735",
    cornerStroke: "#927358",
    cornerDetail: false,
    cornerDot: false,
  },
  A: {
    code: "A",
    label: "Uncommon",
    accent: "#6f8772",
    glowCol: "rgba(111,135,114,0.14)",
    borderOut: "#6d8168",
    borderIn: "#b8c9b1",
    wire: "rgba(83,113,87,0.18)",
    wireAcc: "rgba(101,140,107,0.34)",
    bgCard: "#e7e4d4",
    bgHeader: "#f3f2e7",
    bgFooter: "#d8d8c6",
    txtName: "#233127",
    txtSub: "#55655a",
    txtFlavor: "#465449",
    cornerStroke: "#69806a",
    cornerDetail: false,
    cornerDot: false,
  },
  S: {
    code: "S",
    label: "Rare",
    accent: "#6f84a7",
    glowCol: "rgba(111,132,167,0.18)",
    borderOut: "#657799",
    borderIn: "#b7c6df",
    wire: "rgba(83,109,152,0.18)",
    wireAcc: "rgba(92,126,186,0.34)",
    bgCard: "#e2e3ea",
    bgHeader: "#f2f4f8",
    bgFooter: "#d4d7e0",
    txtName: "#20293c",
    txtSub: "#51627d",
    txtFlavor: "#46536a",
    cornerStroke: "#677ea3",
    cornerDetail: true,
    cornerDot: false,
  },
  E: {
    code: "E",
    label: "Epic",
    accent: "#8f6daa",
    glowCol: "rgba(143,109,170,0.22)",
    borderOut: "#82629b",
    borderIn: "#d6c0e0",
    wire: "rgba(126,89,150,0.19)",
    wireAcc: "rgba(142,99,170,0.36)",
    bgCard: "#e7deed",
    bgHeader: "#f5eef7",
    bgFooter: "#d9cee0",
    txtName: "#2d1d38",
    txtSub: "#6f537e",
    txtFlavor: "#5f466d",
    cornerStroke: "#85659d",
    cornerDetail: true,
    cornerDot: true,
  },
  "S+": {
    code: "S+",
    label: "Legendary",
    accent: "#b38b3d",
    glowCol: "rgba(179,139,61,0.28)",
    borderOut: "#a2792a",
    borderIn: "#e9d39a",
    wire: "rgba(170,124,26,0.21)",
    wireAcc: "rgba(198,152,48,0.38)",
    bgCard: "#f0e5c6",
    bgHeader: "#faf2dd",
    bgFooter: "#e5d6ab",
    txtName: "#39280c",
    txtSub: "#826221",
    txtFlavor: "#6b511d",
    cornerStroke: "#ae8731",
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
