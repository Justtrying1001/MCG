import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("contest user page sticky + lineup duplicate guardrails", () => {
  it("keeps contest topbar sticky below main fixed nav", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain("top: calc(var(--nav-h) + 2px);");
    expect(source).toContain(".cpd-topbar {");
  });

  it("exposes duplicate-token error messaging in contest page", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain("This token is already used in your lineup.");
    expect(source).toContain("findDuplicateLineupIdentityKeys");
  });

  it("disables already-used tokens in lineup builder modal", () => {
    const source = readFileSync("components/contests/LineupBuilderModal.tsx", "utf8");
    expect(source).toContain("duplicateTokenInOtherSlot");
    expect(source).toContain("Already used");
  });
});
