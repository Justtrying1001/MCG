import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contests hub empty/error handling", () => {
  it("contains dedicated empty state messaging for no matches", () => {
    const source = readFileSync("app/contests/page.tsx", "utf8");
    expect(source).toContain("No contests in this lifecycle");
    expect(source).toContain("Adjust filters or check another status tab.");
  });

  it("parses API errors and avoids raw response text rendering", () => {
    const source = readFileSync("app/contests/page.tsx", "utf8");
    expect(source).toContain("await res.json().catch(() => null)");
    expect(source).not.toContain("await res.text()");
  });
});
