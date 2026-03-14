import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contest hub tabs contract", () => {
  it("keeps only OPEN/LOCKED/LIVE/SETTLED lifecycle tabs", () => {
    const source = readFileSync("components/contests/ContestLifecycleTabs.tsx", "utf8");
    expect(source).toContain('"OPEN"');
    expect(source).toContain('"LOCKED"');
    expect(source).toContain('"LIVE"');
    expect(source).toContain('"SETTLED"');
    expect(source).not.toContain('"UPCOMING"');
  });
});
