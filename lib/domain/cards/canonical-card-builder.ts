import type { MvpCardView } from "@/types/cards";
import { findTokenMasterBySlug, toMvpCardViewFromTokenMasterRow } from "@/lib/domain/cards/token-master";
import { validateCanonicalCardView } from "@/lib/domain/cards/canonical-card-view";

export type CanonicalCardBuildInput = {
  source: string;
  tokenSlug: string;
  templateId: string;
  rarityCode: string;
  editionCode: string;
  plannedSupply: number;
  issuedSupply: number;
  instanceCount: number;
  editionNumber?: number | null;
};

export function buildCanonicalCardViewOrThrow(input: CanonicalCardBuildInput): MvpCardView {
  const token = findTokenMasterBySlug(input.tokenSlug);
  if (!token) {
    throw new Error(`[${input.source}] token-master lookup failed for slug='${input.tokenSlug}' (template=${input.templateId})`);
  }

  const cardView = toMvpCardViewFromTokenMasterRow({
    token,
    templateId: input.templateId,
    rarityCode: input.rarityCode,
    editionCode: input.editionCode,
    plannedSupply: input.plannedSupply,
    issuedSupply: input.issuedSupply,
    instanceCount: input.instanceCount,
    editionNumber: input.editionNumber ?? null,
  });

  const validation = validateCanonicalCardView(cardView);
  if (!validation.ok) {
    throw new Error(
      `[${input.source}] canonical cardView invalid for template=${input.templateId}, slug='${input.tokenSlug}': ${validation.issues.join("; ")}`,
    );
  }

  return validation.cardView;
}
