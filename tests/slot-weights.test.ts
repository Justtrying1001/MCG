import { describe, expect, it } from "vitest";

import { drawWeightForTemplate, slotTypeForIndex } from "@/lib/domain/acquisition/slot-weights";

describe("slot weights", () => {
  it("maps last slot to hit slot and previous to edition boost", () => {
    expect(slotTypeForIndex(0, 5)).toBe("STANDARD");
    expect(slotTypeForIndex(3, 5)).toBe("EDITION_BOOST");
    expect(slotTypeForIndex(4, 5)).toBe("RARITY_HIT");
  });

  it("favors legendary in hit slot over standard slot", () => {
    const standardLegendary = drawWeightForTemplate({
      slotType: "STANDARD",
      remainingSupply: 10,
      rarityCode: "LEGENDARY",
      editionCode: "BASE",
    });

    const hitLegendary = drawWeightForTemplate({
      slotType: "RARITY_HIT",
      remainingSupply: 10,
      rarityCode: "LEGENDARY",
      editionCode: "BASE",
    });

    expect(hitLegendary).toBeGreaterThan(standardLegendary);
  });
});
