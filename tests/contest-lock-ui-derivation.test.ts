import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contest lock UI derivation", () => {
  it("uses isLockedByActiveContest and not lockState in selectable card panels", () => {
    const selector = readFileSync("components/contests/CardSelectorModal.tsx", "utf8");
    const eligible = readFileSync("components/contests/EligibleCardsPanel.tsx", "utf8");

    expect(selector).toContain("item.isLockedByActiveContest");
    expect(eligible).toContain("item.isLockedByActiveContest");
    expect(eligible).not.toContain("Boolean(item.lockState)");
  });
});
