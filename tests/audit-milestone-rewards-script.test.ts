import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("milestone rewards audit script", () => {
  it("reports 15 seeded definitions in code mode", () => {
    const output = execSync("node prisma/audit-milestone-rewards.mjs", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, DATABASE_URL: "" },
    });

    const payload = JSON.parse(output);
    expect(payload.source).toBe("code-only");
    expect(payload.seededDefinitionsInCode).toBe(15);
    expect(payload.idempotenceStrategy).toContain("create-if-missing");
  });
});
