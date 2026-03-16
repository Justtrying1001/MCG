import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

describe("MVP controlled-emission bootstrap dry-run", () => {
  it("prints expected invariant counts", () => {
    const output = execSync("node prisma/seed-mvp-controlled-emission.mjs --dry-run", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    expect(output).toContain("[dry-run] tokens: 25");
    expect(output).toContain("[dry-run] templates: 625");
    expect(output).toContain("[dry-run] planned supply per token: 1600");
    expect(output).toContain("[dry-run] total planned supply: 40000");
  });
});
