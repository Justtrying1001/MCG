import type { CSSProperties } from "react";

export type MvpRarityCode = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type MvpEditionCode = "BASE" | "REVERSE" | "BRILLANTE" | "HOLO" | "FULL_ART";

export type RarityThemeV2 = {
  code: MvpRarityCode;
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

export type EditionThemeV2 = {
  code: MvpEditionCode;
  badgeLabel: string;
  cardClass: string;
  needsReverseLayers: boolean;
  needsBrillanteLayer: boolean;
  needsHoloLayer: boolean;
  needsFullArtLayer: boolean;
  prioritizeArt: boolean;
};

const RARITY_THEMES: Record<MvpRarityCode, RarityThemeV2> = {
  COMMON: {
    code: "COMMON",
    accent: "#3d4a5c",
    glowCol: "rgba(61, 74, 92, 0)",
    borderOut: "#181e27",
    borderIn: "#1f2733",
    wire: "rgba(255,255,255,0.05)",
    wireAcc: "rgba(255,255,255,0.07)",
    bgCard: "#11111b",
    bgHeader: "#0d0d16",
    bgFooter: "#0b0b14",
    txtName: "#c8d0dc",
    txtSub: "#60718a",
    txtFlavor: "#73819b",
    cornerStroke: "#2a3545",
    cornerDetail: false,
    cornerDot: false,
  },
  UNCOMMON: {
    code: "UNCOMMON",
    accent: "#5a7a8a",
    glowCol: "rgba(90, 122, 138, 0.12)",
    borderOut: "#1e2d38",
    borderIn: "#253545",
    wire: "rgba(90,122,138,0.10)",
    wireAcc: "rgba(90,122,138,0.18)",
    bgCard: "#0d1418",
    bgHeader: "#0a1014",
    bgFooter: "#090e12",
    txtName: "#d4dde6",
    txtSub: "#7f9fb6",
    txtFlavor: "#8aa1b1",
    cornerStroke: "#3a5060",
    cornerDetail: false,
    cornerDot: false,
  },
  RARE: {
    code: "RARE",
    accent: "#7090b8",
    glowCol: "rgba(112, 144, 184, 0.22)",
    borderOut: "#243050",
    borderIn: "#2d3d60",
    wire: "rgba(112,144,184,0.12)",
    wireAcc: "rgba(112,144,184,0.22)",
    bgCard: "#0d1220",
    bgHeader: "#0a0f1a",
    bgFooter: "#090d16",
    txtName: "#dce6f4",
    txtSub: "#89a4cd",
    txtFlavor: "#8ea8cb",
    cornerStroke: "#4a6888",
    cornerDetail: true,
    cornerDot: false,
  },
  EPIC: {
    code: "EPIC",
    accent: "#9279c7",
    glowCol: "rgba(146, 121, 199, 0.28)",
    borderOut: "#3d2a62",
    borderIn: "#4b3578",
    wire: "rgba(146,121,199,0.14)",
    wireAcc: "rgba(146,121,199,0.26)",
    bgCard: "#120d1f",
    bgHeader: "#0f0a1a",
    bgFooter: "#0c0816",
    txtName: "#efe8ff",
    txtSub: "#b59cd8",
    txtFlavor: "#bca8e1",
    cornerStroke: "#8f71bf",
    cornerDetail: true,
    cornerDot: true,
  },
  LEGENDARY: {
    code: "LEGENDARY",
    accent: "#b89a60",
    glowCol: "rgba(184, 154, 96, 0.35)",
    borderOut: "#3a2e18",
    borderIn: "#4a3c22",
    wire: "rgba(184,154,96,0.12)",
    wireAcc: "rgba(184,154,96,0.25)",
    bgCard: "#0e0b04",
    bgHeader: "#0b0802",
    bgFooter: "#090703",
    txtName: "#ece0c8",
    txtSub: "#d6bf8f",
    txtFlavor: "#ceb483",
    cornerStroke: "#8a7040",
    cornerDetail: true,
    cornerDot: true,
  },
};

const EDITION_THEMES: Record<MvpEditionCode, EditionThemeV2> = {
  BASE: {
    code: "BASE",
    badgeLabel: "",
    cardClass: "edBase",
    needsReverseLayers: false,
    needsBrillanteLayer: false,
    needsHoloLayer: false,
    needsFullArtLayer: false,
    prioritizeArt: false,
  },
  REVERSE: {
    code: "REVERSE",
    badgeLabel: "REV",
    cardClass: "edReverse",
    needsReverseLayers: true,
    needsBrillanteLayer: false,
    needsHoloLayer: false,
    needsFullArtLayer: false,
    prioritizeArt: false,
  },
  BRILLANTE: {
    code: "BRILLANTE",
    badgeLabel: "BRILL",
    cardClass: "edBrillante",
    needsReverseLayers: false,
    needsBrillanteLayer: true,
    needsHoloLayer: false,
    needsFullArtLayer: false,
    prioritizeArt: false,
  },
  HOLO: {
    code: "HOLO",
    badgeLabel: "HOLO",
    cardClass: "edHolo",
    needsReverseLayers: false,
    needsBrillanteLayer: false,
    needsHoloLayer: true,
    needsFullArtLayer: false,
    prioritizeArt: false,
  },
  FULL_ART: {
    code: "FULL_ART",
    badgeLabel: "FULL ART",
    cardClass: "edFullArt",
    needsReverseLayers: false,
    needsBrillanteLayer: false,
    needsHoloLayer: false,
    needsFullArtLayer: true,
    prioritizeArt: true,
  },
};

const normalize = (value: string | null | undefined) => (value ?? "").trim().toUpperCase();

export const resolveRarity = (rarity: string): RarityThemeV2 => {
  const normalized = normalize(rarity);
  return RARITY_THEMES[normalized as MvpRarityCode] ?? RARITY_THEMES.COMMON;
};

export const resolveEdition = (edition: string): EditionThemeV2 => {
  const normalized = normalize(edition);
  return EDITION_THEMES[normalized as MvpEditionCode] ?? EDITION_THEMES.BASE;
};

export const getRarityVars = (rarity: RarityThemeV2): CSSProperties => ({
  "--accent": rarity.accent,
  "--glow-col": rarity.glowCol,
  "--border-out": rarity.borderOut,
  "--border-in": rarity.borderIn,
  "--wire": rarity.wire,
  "--wire-acc": rarity.wireAcc,
  "--bg-card": rarity.bgCard,
  "--bg-header": rarity.bgHeader,
  "--bg-footer": rarity.bgFooter,
  "--txt-name": rarity.txtName,
  "--txt-sub": rarity.txtSub,
  "--txt-flavor": rarity.txtFlavor,
} as CSSProperties);
