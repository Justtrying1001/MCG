import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contest detail rewards panel", () => {
  it("prioritizes exact tier rows for live contests and avoids pool-card fallback", () => {
    const source = readFileSync("components/contests/ContestDetailPanels.tsx", "utf8");
    expect(source).toContain('Track the current payout by placement while the contest is live.');
    expect(source).toContain('Exact live payouts are not available yet for this contest.');
    expect(source).toContain(') : isLive ? (');
    expect(source).toContain(') : hasPolicyData && summary ? (');
  });

  it("renders payout table headers for rank-first reward rows", () => {
    const source = readFileSync("components/contests/ContestDetailPanels.tsx", "utf8");
    expect(source).toContain('>Placement<');
    expect(source).toContain('>Payout<');
    expect(source).toContain('aria-label={isSettled ? "Final reward payout table" : "Live reward payout table"}');
  });
});
