import { describe, expect, it } from "vitest";
import { buildMemedexFinishRows, buildMemedexRarityRows } from "@/components/home/memedexSummary";
import type { CollectionProjectionV2 } from "@/types/session";

const projection: CollectionProjectionV2 = {
  totalOwnedInstances: 27,
  ownedTemplateCount: 12,
  missingTemplateCount: 8,
  completionPct: 60,
  byTokenId: [],
  byRarity: [
    { rarityCode: "COMMON", count: 12 },
    { rarityCode: "UNCOMMON", count: 8 },
    { rarityCode: "RARE", count: 3 },
    { rarityCode: "EPIC", count: 2 },
    { rarityCode: "LEGENDARY", count: 1 },
  ],
  byEdition: [
    { editionCode: "BASE", count: 15 },
    { editionCode: "REVERSE", count: 6 },
    { editionCode: "HOLO", count: 4 },
    { editionCode: "FULL_ART", count: 2 },
  ],
};

describe("home Memedex summary helpers", () => {
  it("maps uppercase rarity codes from the collection projection to readable labels", () => {
    expect(buildMemedexRarityRows(projection)).toEqual([
      { key: "COMMON", label: "Common", count: 12 },
      { key: "UNCOMMON", label: "Uncommon", count: 8 },
      { key: "RARE", label: "Rare", count: 3 },
      { key: "EPIC", label: "Epic", count: 2 },
      { key: "LEGENDARY", label: "Legendary", count: 1 },
    ]);
  });

  it("returns placeholders instead of silent zeroes when collection data is still unavailable", () => {
    expect(buildMemedexRarityRows(undefined).every((row) => row.count === null)).toBe(true);
    expect(buildMemedexFinishRows(undefined).every((row) => row.count === null)).toBe(true);
  });
});
