import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contest detail targeted correction smoke", () => {
  it("uses contest rule coverImageUrl before lineup fallback art", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain('contest.rules[0]?.config?.coverImageUrl?.trim()');
  });

  it("keeps contest details in the support rail and removes facts panel usage", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain("<ContestDetailsPanel");
    expect(source).not.toContain("<FactsLifecyclePanel");
    expect(source).not.toContain("<ContestDetailsAccordion");
  });

  it("renders configured reward pool copy when policy data exists without visible tiers", () => {
    const source = readFileSync("components/contests/ContestDetailPanels.tsx", "utf8");
    expect(source).toContain("Reward pool configured");
    expect(source).toContain("hasPolicyData && summary");
  });
});
