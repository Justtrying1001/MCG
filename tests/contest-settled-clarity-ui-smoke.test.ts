import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contest settled clarity ui smoke", () => {
  it("documents rewards and card unlock messaging in result panel", () => {
    const source = readFileSync("components/contests/ContestResultPanel.tsx", "utf8");
    expect(source).toContain("Rewards are granted during settlement processing");
    expect(source).toContain("cards are unlocked");
  });

  it("adds settled clarity to history cards", () => {
    const source = readFileSync("components/contests/ContestHistoryCard.tsx", "utf8");
    expect(source).toContain("rewards processed during settlement");
    expect(source).toContain("cards are available again");
  });
});
