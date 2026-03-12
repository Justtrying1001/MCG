import { describe, expect, it } from "vitest";

import {
  buildContestAuditQuery,
  getAllowedContestTransitions,
  getContestOverviewProgress,
  lifecycleValidationState,
  parseScoringRowsFromText,
  summarizeSettlementTotals,
} from "@/lib/admin/contest-workbench";

describe("contest workbench helpers", () => {
  it("computes overview key states", () => {
    expect(getContestOverviewProgress({ entries: 0, rankings: 0, settlements: 0 })).toEqual({
      entries: 0,
      scoringReady: false,
      rankingGenerated: false,
      settlementDone: false,
    });

    expect(getContestOverviewProgress({ entries: 12, rankings: 12, settlements: 1 })).toEqual({
      entries: 12,
      scoringReady: true,
      rankingGenerated: true,
      settlementDone: true,
    });
  });

  it("evaluates lifecycle blocked vs allowed", () => {
    expect(lifecycleValidationState({ blocking: true, issues: [{ severity: "ERROR" }] }).canExecute).toBe(false);
    expect(lifecycleValidationState({ blocking: false, issues: [{ severity: "WARN" }] }).canExecute).toBe(true);
  });

  it("returns allowed lifecycle transitions", () => {
    expect(getAllowedContestTransitions("DRAFT")).toEqual(["OPEN", "CANCELED"]);
    expect(getAllowedContestTransitions("SETTLED")).toEqual([]);
  });

  it("parses scoring rows and returns row-level parse errors", () => {
    const ok = parseScoringRowsFromText("u1,10\nu2\t20");
    expect(ok.errors).toHaveLength(0);
    expect(ok.rows).toHaveLength(2);

    const bad = parseScoringRowsFromText("u1\n,abc");
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it("summarizes settlement preview totals", () => {
    const summary = summarizeSettlementTotals([
      { type: "POINTS", amount: 100 },
      { type: "PACK" },
      { type: "POINTS", amount: 50 },
    ]);

    expect(summary.usersCount).toBe(3);
    expect(summary.rewardActionsCount).toBe(3);
    expect(summary.pointsCreditTotal).toBe(150);
  });

  it("builds contest audit timeline query", () => {
    const query = buildContestAuditQuery("c1");
    expect(query).toContain("/api/internal/admin-actions?");
    expect(query).toContain("targetId=c1");
    expect(query).toContain("module=CONTESTS");
  });
});
