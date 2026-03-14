import { describe, expect, it } from "vitest";

import { getDeleteActionState, getStopActionState } from "@/lib/admin/contest-actions";

describe("admin contest action policies", () => {
  it("allows stop only before settlement/cancel", () => {
    expect(getStopActionState("OPEN").allowed).toBe(true);
    expect(getStopActionState("SETTLED")).toEqual({
      allowed: false,
      reason: "Contest is already settled. Use archive for cleanup if needed.",
    });
  });

  it("blocks delete on active contest with operations", () => {
    const result = getDeleteActionState("LIVE", { entries: 2, scores: 0, rankings: 0, settlements: 0 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Cancel|cancel/);
  });

  it("allows delete for canceled contest", () => {
    const result = getDeleteActionState("CANCELED", { entries: 3, scores: 1, rankings: 1, settlements: 1 });
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("canceled contests");
  });
});
