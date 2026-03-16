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

  it("blocks delete on active contest statuses", () => {
    const result = getDeleteActionState("LIVE", { entries: 2, scores: 0, rankings: 0, settlements: 0 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Stop the contest first/);
  });

  it("allows delete for canceled, settled and draft contests", () => {
    expect(getDeleteActionState("CANCELED", { entries: 3, scores: 1, rankings: 1, settlements: 1 }).allowed).toBe(true);
    expect(getDeleteActionState("SETTLED", { entries: 3, scores: 1, rankings: 1, settlements: 1 }).allowed).toBe(true);
    expect(getDeleteActionState("DRAFT", { entries: 0, scores: 0, rankings: 0, settlements: 0 }).allowed).toBe(true);
  });
});
