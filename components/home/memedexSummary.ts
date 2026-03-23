import { formatMemedexFinish } from "@/components/collection/memedexFinish";
import type { CollectionProjectionV2 } from "@/types/session";

export type MemedexSummaryRow = {
  key: string;
  label: string;
  count: number | null;
};

const RARITY_ORDER = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] as const;
const RARITY_LABELS: Record<(typeof RARITY_ORDER)[number], string> = {
  COMMON: "Common",
  UNCOMMON: "Uncommon",
  RARE: "Rare",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
};

const FINISH_ORDER = ["Base", "Reverse", "Holo", "Full Art"] as const;

export function buildMemedexRarityRows(collectionProjection?: CollectionProjectionV2): MemedexSummaryRow[] {
  if (!collectionProjection) {
    return RARITY_ORDER.map((key) => ({ key, label: RARITY_LABELS[key], count: null }));
  }

  const rarityCounts = new Map(collectionProjection.byRarity.map((item) => [item.rarityCode.toUpperCase(), item.count]));
  return RARITY_ORDER.map((key) => ({
    key,
    label: RARITY_LABELS[key],
    count: rarityCounts.get(key) ?? null,
  }));
}

export function buildMemedexFinishRows(collectionProjection?: CollectionProjectionV2): MemedexSummaryRow[] {
  if (!collectionProjection) {
    return FINISH_ORDER.map((label) => ({ key: label.toUpperCase().replace(/\s+/g, "_"), label, count: null }));
  }

  const finishCounts = new Map(
    collectionProjection.byEdition.map((item) => [formatMemedexFinish(item.editionCode), item.count]),
  );

  return FINISH_ORDER.map((label) => ({
    key: label.toUpperCase().replace(/\s+/g, "_"),
    label,
    count: finishCounts.get(label) ?? null,
  }));
}
