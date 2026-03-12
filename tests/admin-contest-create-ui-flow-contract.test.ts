import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin contest create UI flow contract", () => {
  it("exposes explicit draft/validate/publish actions", () => {
    const source = readFileSync("app/admin/(protected)/contests/create/page.tsx", "utf8");
    expect(source).toContain("Create draft, validate & publish");
    expect(source).toContain("Validate & publish draft");
    expect(source).toContain("Save draft");
    expect(source).toContain("Validate draft");
    expect(source).toContain("Publish draft");
  });

  it("keeps explicit non-silent API feedback handling", () => {
    const source = readFileSync("app/admin/(protected)/contests/create/page.tsx", "utf8");
    expect(source).toContain("consumeApiError");
    expect(source).toContain('aria-live={notice.tone === "danger" ? "assertive" : "polite"}');
    expect(source).toContain("postContestConfig");
    expect(source).toContain("requestValidation");
    expect(source).toContain("requestPublish");
  });
});
