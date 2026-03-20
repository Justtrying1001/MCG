import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contest detail targeted correction smoke", () => {
  it("uses contest rule coverImageUrl before lineup fallback art", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain('contest.rules[0]?.config?.coverImageUrl?.trim()');
  });

  it("keeps rewards and leaderboard in the support rail without restoring facts panel variants", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain("<RewardsPanel");
    expect(source).toContain("<LeaderboardPanel");
    expect(source).not.toContain("<FactsLifecyclePanel");
    expect(source).not.toContain("<ContestDetailsAccordion");
  });

  it("keeps pool overview fallback scoped away from live contests", () => {
    const source = readFileSync("components/contests/ContestDetailPanels.tsx", "utf8");
    expect(source).toContain("Reward pool configured");
    expect(source).toContain("hasPolicyData && summary");
    expect(source).toContain("isLive ?");
  });

  it("moves the how contests work link into the action panel below the primary CTA", () => {
    const source = readFileSync("components/contests/ContestDetailPanels.tsx", "utf8");
    const titleIndex = source.indexOf("<h1>{title}</h1>");
    const helperIndex = source.indexOf("Not sure how it works?");
    const actionPanelIndex = source.indexOf('className="contest-detail-hero-action-panel"');
    expect(helperIndex).toBeGreaterThan(actionPanelIndex);
    expect(helperIndex).toBeGreaterThan(titleIndex);
    expect(source).toContain('className="contest-detail-help-panel"');
    expect(source).toContain('target="_blank"');
    expect(source).toContain('rel="noopener noreferrer"');
  });

});
