import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contest detail sticky topbar css", () => {
  it("keeps contest topbar below global nav", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain("top: var(--nav-h);");
    expect(source).toContain("z-index: 90;");
  });
});
