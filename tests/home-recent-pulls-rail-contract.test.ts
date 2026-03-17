import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("RecentPullsRail contract", () => {
  const source = readFileSync("components/home/RecentPullsRail.tsx", "utf8");
  const styles = readFileSync("styles/components.css", "utf8");

  it("uses real MCG card tile renderer", () => {
    expect(source).toContain("MvpCardTile");
    expect(source).toContain('variant="canonical"');
  });

  it("keeps live feed metadata and empty state", () => {
    expect(source).toContain("formatRelativeTime");
    expect(source).toContain("No recent pulls yet");
  });

  it("renders horizontal rail wrapper and responsive card widths", () => {
    expect(source).toContain("mcg-recent-pulls-rail");
    expect(styles).toContain(".mcg-recent-pulls-rail");
    expect(styles).toContain(".mcg-recent-pull-item { min-width: 205px; max-width: 205px; }");
    expect(styles).toContain(".mcg-recent-pull-item { min-width: 180px; max-width: 180px; }");
  });
});
