import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin contests catalog UI smoke", () => {
  it("keeps a prominent create contest CTA", () => {
    const source = readFileSync("app/admin/(protected)/contests/page.tsx", "utf8");
    expect(source).toContain("Create New Contest");
    expect(source).toContain("Start here");
  });
});
