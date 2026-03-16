import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("contest user page sticky + lineup duplicate guardrails", () => {
  it("keeps contest topbar sticky below main fixed nav", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain("top: var(--nav-h);");
    expect(source).toContain(".cpd-topbar {");
  });

  it("exposes duplicate-token error messaging in contest page", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain("This token is already used in your lineup.");
    expect(source).toContain("findDuplicateLineupIdentityKeys");
  });

  it("disables already-used tokens in lineup builder modal", () => {
    const source = readFileSync("components/contests/LineupBuilderModal.tsx", "utf8");
    expect(source).toContain("tokenAlreadyUsed");
    expect(source).toContain("Already used");
  });

  it("renders settled lineup card scores without exposing technical breakdown UI", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain('slotCard.finalScore !== null ? `${slotCard.finalScore.toFixed(2)} pts` : "—"');
    expect(source).toContain('aria-label="Final card score"');
    expect(source).not.toContain('Score details');
    expect(source).not.toContain('Hide details');
    expect(source).not.toContain('Show details');
    expect(source).not.toContain('Per-card scoring');
  });

  it("keeps existing OPEN/LOCKED/LIVE lineup behaviors and total score stat", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain('const isOpen = status === "OPEN";');
    expect(source).toContain('const isLocked = status === "LOCKED";');
    expect(source).toContain('const isLive = status === "LIVE";');
    expect(source).toContain('cpd-slot-lock-overlay');
    expect(source).toContain('<span className="cpd-stat-label">Your score</span>');
  });

});
