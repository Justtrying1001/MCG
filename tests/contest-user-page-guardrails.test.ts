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

  it("loads contest data without requiring an authenticated session", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain("if (loading) return;");
    expect(source).toContain("void loadAll();");
    expect(source).toContain("Connectez-vous pour créer et soumettre votre lineup.");
    expect(source).toContain("Contest inaccessible ou en cours de préparation");
  });

  it("keeps detail/ranking/reward APIs publicly readable while lineup endpoints stay protected", () => {
    const detailRoute = readFileSync("app/api/contests/[contestId]/route.ts", "utf8");
    const rankingRoute = readFileSync("app/api/contests/[contestId]/ranking/route.ts", "utf8");
    const rewardRoute = readFileSync("app/api/contests/[contestId]/reward-preview/route.ts", "utf8");
    const optionsRoute = readFileSync("app/api/contests/[contestId]/lineup-options/route.ts", "utf8");

    expect(detailRoute).toContain("getContestDetailMvp(params.contestId, user?.id)");
    expect(rankingRoute).not.toContain('new NextResponse("Unauthorized"');
    expect(rewardRoute).not.toContain('new NextResponse("Unauthorized"');
    expect(optionsRoute).toContain('new NextResponse("Unauthorized", { status: 401 })');
  });

});
