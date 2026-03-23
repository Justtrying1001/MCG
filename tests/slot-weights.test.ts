import { describe, expect, it } from "vitest";

import { drawWeightForTemplate } from "@/lib/domain/acquisition/slot-weights";

describe("card odds weights", () => {
  it("multiplies remaining supply by the card odds weight", () => {
    expect(drawWeightForTemplate({ remainingSupply: 10, oddsWeight: 7 })).toBe(70);
  });

  it("falls back to weight 1 when oddsWeight is invalid", () => {
    expect(drawWeightForTemplate({ remainingSupply: 12, oddsWeight: 0 })).toBe(12);
    expect(drawWeightForTemplate({ remainingSupply: 12, oddsWeight: Number.NaN })).toBe(12);
  });

  it("returns zero when no remaining supply is available", () => {
    expect(drawWeightForTemplate({ remainingSupply: 0, oddsWeight: 999 })).toBe(0);
  });
});
