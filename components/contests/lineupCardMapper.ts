import type { LineupOption } from "@/components/contests/types";
import type { MvpCardView } from "@/types/cards";

const missingCardViewLogged = new Set<string>();

const requiredCardViewFields: Array<keyof MvpCardView> = [
  "templateId",
  "tokenId",
  "displayName",
  "symbol",
  "rarity",
  "edition",
];

function hasCompleteCardView(option: LineupOption): option is LineupOption & { cardView: MvpCardView } {
  if (!option.cardView) return false;

  for (const field of requiredCardViewFields) {
    const value = option.cardView[field];
    if (typeof value === "string" && value.trim().length === 0) return false;
    if (value === null || value === undefined) return false;
  }

  return true;
}

function logCardViewIssue(option: LineupOption) {
  const context = {
    instanceId: option.instanceId,
    cardTemplateId: option.cardTemplateId,
    name: option.name,
    rarityCode: option.rarityCode,
    editionCode: option.editionCode,
    hasCardView: Boolean(option.cardView),
  };

  const key = `${option.instanceId}:${option.cardTemplateId}`;
  if (missingCardViewLogged.has(key)) return;
  missingCardViewLogged.add(key);
  console.error("[contests] Missing or incomplete cardView; canonical card render disabled for this option.", context);
}

export function toMvpCardView(option: LineupOption): MvpCardView | null {
  if (hasCompleteCardView(option)) return option.cardView;
  logCardViewIssue(option);
  return null;
}
