import { describe, expect, it } from "vitest";
import { getActionability, getPhaseLabel, getPrimaryCtaLabel, toUserPhase } from "@/components/contests/contestLifecycle";

describe("contest user lifecycle mapping", () => {
  it("maps technical statuses to user phases", () => {
    expect(toUserPhase("OPEN")).toBe("OPEN");
    expect(toUserPhase("LOCKED")).toBe("TEAM_LOCK");
    expect(toUserPhase("LIVE")).toBe("LIVE");
    expect(toUserPhase("SETTLED")).toBe("RESULT");
  });

  it("exposes clear actionability", () => {
    expect(getActionability("OPEN").editable).toBe(true);
    expect(getActionability("LOCKED").editable).toBe(false);
    expect(getActionability("SETTLED").message).toContain("Results are available");
    expect(getPhaseLabel("LOCKED")).toMatch(/Team Lock/);
  });

  it("maps status to coherent CTA labels", () => {
    expect(getPrimaryCtaLabel("OPEN")).toBe("Enter contest");
    expect(getPrimaryCtaLabel("LIVE")).toBe("View live standings");
    expect(getPrimaryCtaLabel("SETTLED")).toBe("View results");
  });
});
