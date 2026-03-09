export const MCG_RARITY_TIERS = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
] as const;

export const MCG_EDITION_TYPES = [
  "BASE",
  "REVERSE",
  "BRILLANTE",
  "HOLO",
  "FULL_ART",
] as const;

export type McgRarityTier = (typeof MCG_RARITY_TIERS)[number];
export type McgEditionType = (typeof MCG_EDITION_TYPES)[number];

export type DomainPhaseTag = "legacy" | "parallel-target" | "projection-foundation";

export type DomainBoundaryNote = {
  domain: "catalog" | "ownership" | "acquisition" | "contests" | "progression" | "projections";
  phaseTag: DomainPhaseTag;
  note: string;
};
