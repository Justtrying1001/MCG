import { describe, expect, it } from "vitest";

import { buildContestSurfaceLinks, buildQuestSurfaceLinks, filterContestCatalogRows } from "@/lib/admin/catalog";

describe("contest catalog filtering", () => {
  const rows = [
    { id: "c1", code: "WEEKLY_1", title: "Weekly Alpha", status: "LIVE" as const },
    { id: "c2", code: "WEEKLY_2", title: "Weekly Beta", status: "DRAFT" as const },
    { id: "c3", code: "FINALS", title: "Grand Finals", status: "SETTLED" as const },
  ];

  it("filters by status", () => {
    const result = filterContestCatalogRows(rows, "LIVE", "");
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("WEEKLY_1");
  });

  it("filters by code/title query", () => {
    const byCode = filterContestCatalogRows(rows, "ALL", "final");
    expect(byCode.map((row) => row.code)).toEqual(["FINALS"]);

    const byTitle = filterContestCatalogRows(rows, "ALL", "beta");
    expect(byTitle.map((row) => row.code)).toEqual(["WEEKLY_2"]);
  });

  it("builds routing links toward new contest surfaces", () => {
    const links = buildContestSurfaceLinks("contest_1");
    expect(links.overview).toBe("/admin/contests/contest_1");
    expect(links.scoring).toBe("/admin/contests/contest_1/scoring");
    expect(links.settlement).toBe("/admin/contests/contest_1/settlement");
    expect(links.audit).toBe("/admin/contests/contest_1/audit");
    expect(links.legacy).toBe("/admin/contests/legacy/contest_1");
  });

  it("builds routing links for quest and moderation phase-4 surfaces", () => {
    const links = buildQuestSurfaceLinks("q1");
    expect(links.library).toBe("/admin/quests");
    expect(links.detail).toBe("/admin/quests/q1");
    expect(links.builderEdit).toBe("/admin/quests/builder?questId=q1");
    expect(links.moderationQueue).toBe("/admin/moderation?questId=q1");
    expect(links.moderationHistory).toBe("/admin/moderation/history?questId=q1");
  });
});
