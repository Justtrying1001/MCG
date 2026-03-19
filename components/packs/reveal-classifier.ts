import type { MvpCardView } from "@/types/cards";

export type RevealIntensity = "minimal" | "subtle" | "strong";
export type RevealPreset = "standard" | "rare" | "epic" | "legendary";
export type EditionEffect = "none" | "reverse" | "brillante" | "holo" | "full-art";

export type RevealClassification = {
  revealIntensity: RevealIntensity;
  revealPreset: RevealPreset;
  editionEffect: EditionEffect;
  spotlightLevel: 0 | 1 | 2 | 3;
};

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

function classifyByRarity(rarity: string): Omit<RevealClassification, "editionEffect"> {
  switch (normalize(rarity)) {
    case "RARE":
      return { revealIntensity: "subtle", revealPreset: "rare", spotlightLevel: 1 };
    case "EPIC":
      return { revealIntensity: "strong", revealPreset: "epic", spotlightLevel: 2 };
    case "LEGENDARY":
      return { revealIntensity: "strong", revealPreset: "legendary", spotlightLevel: 3 };
    case "UNCOMMON":
      return { revealIntensity: "minimal", revealPreset: "standard", spotlightLevel: 1 };
    case "COMMON":
    default:
      return { revealIntensity: "minimal", revealPreset: "standard", spotlightLevel: 0 };
  }
}

function classifyEditionEffect(edition: string): EditionEffect {
  switch (normalize(edition)) {
    case "REVERSE":
      return "reverse";
    case "BRILLANTE":
      return "brillante";
    case "HOLO":
    case "HOLOGRAPHIC":
    case "HOLOGRAPHIQUE":
      return "holo";
    case "FULL_ART":
    case "MCG_ART":
      return "full-art";
    case "BASE":
    default:
      return "none";
  }
}

export function classifyReveal(card: MvpCardView): RevealClassification {
  const rarity = classifyByRarity(card.rarity);

  return {
    ...rarity,
    editionEffect: classifyEditionEffect(card.edition),
  };
}
