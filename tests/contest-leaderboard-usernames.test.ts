import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("leaderboard identity rendering", () => {
  it("prefers displayName/xUsername over truncated userId", () => {
    const source = readFileSync("components/contests/LeaderboardCard.tsx", "utf8");
    expect(source).toContain("row.displayName");
    expect(source).toContain("row.xUsername");
    expect(source).not.toContain("userId.slice");
  });
});
