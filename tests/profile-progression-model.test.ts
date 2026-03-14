import { describe, expect, it } from "vitest";

import { buildAccountProgressionSummary, levelFromXp, xpRequiredForLevel } from "@/lib/domain/progression/profile-summary";

describe("profile progression model v2", () => {
  it("uses a non-linear xp curve for level thresholds", () => {
    expect(xpRequiredForLevel(1)).toBe(0);
    expect(xpRequiredForLevel(2)).toBe(100);
    expect(xpRequiredForLevel(3)).toBe(260);
    expect(xpRequiredForLevel(10)).toBeGreaterThan(2000);
  });

  it("derives level only from total xp", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(259)).toBe(2);
    expect(levelFromXp(260)).toBe(3);
  });

  it("builds xp from weighted profile pillars", () => {
    const summary = buildAccountProgressionSummary({
      points: 1000,
      ownedTemplateCount: 50,
      settledEntries: 4,
      contestsWon: 1,
      bestRank: 2,
      legacyXp: 200,
    });

    expect(summary.progressionBreakdown.pointsXp).toBe(350);
    expect(summary.progressionBreakdown.collectionXp).toBe(600);
    expect(summary.progressionBreakdown.competitiveXp).toBe(370);
    expect(summary.progressionBreakdown.legacyXp).toBe(200);
    expect(summary.xp).toBe(1520);
    expect(summary.level).toBe(levelFromXp(summary.xp));
    expect(summary.levelXpFloor).toBeLessThan(summary.xp);
    expect(summary.levelXpCeil).toBeGreaterThan(summary.xp);
  });
});
