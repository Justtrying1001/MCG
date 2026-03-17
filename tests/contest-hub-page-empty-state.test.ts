import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contests hub empty/error handling", () => {
  it("contains dedicated empty state messaging for no matches", () => {
    const source = readFileSync("app/contests/page.tsx", "utf8");
    expect(source).toContain("No contests live right now");
    expect(source).toContain("New tournaments are coming soon.");
  });

  it("parses API errors and avoids raw response text rendering", () => {
    const source = readFileSync("app/contests/page.tsx", "utf8");
    expect(source).toContain("await res.json().catch(() => null)");
    expect(source).not.toContain("await res.text()");
  });
});
