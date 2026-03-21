import type { CSSProperties } from "react";

export type ClaudeRarityCode = "B" | "A" | "S" | "E" | "L" | "M";
export type ClaudeEditionCode = "BASE" | "REVERSE" | "BRILLANTE" | "HOLO" | "MCG_ART";

export type RarityTheme = {
  code: ClaudeRarityCode;
  label: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic";
  accent: string;
};

export type EditionTheme = {
  code: ClaudeEditionCode;
  label: string;
  badgeLabel: string;
  editionClass: "ed-base" | "ed-reverse" | "ed-brillante" | "ed-holo" | "ed-mcgart";
  hasFoilEffect: boolean;
};

const RARITY_THEMES: Record<ClaudeRarityCode, RarityTheme> = {
  B: { code: "B", label: "Common", accent: "#8B8B8B" },
  A: { code: "A", label: "Uncommon", accent: "#8B8B8B" },
  S: { code: "S", label: "Rare", accent: "#3F6FE5" },
  E: { code: "E", label: "Epic", accent: "#6D3FE5" },
  L: { code: "L", label: "Legendary", accent: "#C89A2B" },
  M: { code: "M", label: "Mythic", accent: "#C43A2F" },
};

const EDITION_THEMES: Record<ClaudeEditionCode, EditionTheme> = {
  BASE: { code: "BASE", label: "Base", badgeLabel: "BASE", editionClass: "ed-base", hasFoilEffect: false },
  REVERSE: { code: "REVERSE", label: "Reverse", badgeLabel: "REVERSE", editionClass: "ed-reverse", hasFoilEffect: true },
  BRILLANTE: { code: "BRILLANTE", label: "Brillante", badgeLabel: "BRILLIANT", editionClass: "ed-brillante", hasFoilEffect: true },
  HOLO: { code: "HOLO", label: "Holo", badgeLabel: "HOLO", editionClass: "ed-holo", hasFoilEffect: true },
  MCG_ART: { code: "MCG_ART", label: "MCG Art", badgeLabel: "MCG ART", editionClass: "ed-mcgart", hasFoilEffect: true },
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
    L: "L",
    LEGENDARY: "L",
    "S+": "L",
    M: "M",
    MYTHIC: "M",
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
    "--rarity-accent": theme.accent,
  }) as CSSProperties;

export const prettyEditionLabel = (edition: string) => getEditionTheme(edition).label;
