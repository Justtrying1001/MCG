import type { MvpCardView } from "@/types/cards";

export type CanonicalCardViewValidation = {
  ok: true;
  cardView: MvpCardView;
} | {
  ok: false;
  issues: string[];
};

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateCanonicalCardView(cardView: MvpCardView | null | undefined): CanonicalCardViewValidation {
  if (!cardView) {
    return { ok: false, issues: ["cardView is null"] };
  }

  const issues: string[] = [];

  if (!isNonEmptyString(cardView.templateId)) issues.push("templateId is required");
  if (!isNonEmptyString(cardView.tokenId)) issues.push("tokenId is required");
  if (!isNonEmptyString(cardView.displayName)) issues.push("displayName is required");
  if (!isNonEmptyString(cardView.symbol)) issues.push("symbol is required");
  if (!isNonEmptyString(cardView.rarity)) issues.push("rarity is required");
  if (!isNonEmptyString(cardView.edition)) issues.push("edition is required");

  if (!Object.prototype.hasOwnProperty.call(cardView, "imageUrl")) issues.push("imageUrl field is required");

  if (!isFiniteNumber(cardView.plannedSupply)) issues.push("plannedSupply must be a finite number");
  if (!isFiniteNumber(cardView.issuedSupply)) issues.push("issuedSupply must be a finite number");
  if (!isFiniteNumber(cardView.remainingSupply)) issues.push("remainingSupply must be a finite number");
  if (!isFiniteNumber(cardView.instanceCount)) issues.push("instanceCount must be a finite number");

  if (!isNonEmptyString(cardView.cardNumber ?? "")) issues.push("cardNumber is required");
  if (!isNonEmptyString(cardView.cardText ?? "")) issues.push("cardText is required");
  if (!isNonEmptyString(cardView.setCode ?? "")) issues.push("setCode is required");
  if (!isNonEmptyString(cardView.setEditionLabel ?? "")) issues.push("setEditionLabel is required");

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, cardView };
}
