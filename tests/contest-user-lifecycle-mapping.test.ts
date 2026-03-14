import { describe, expect, it } from "vitest";
import { getActionability, getPhaseLabel, toUserPhase } from "@/components/contests/contestLifecycle";

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
    expect(getPhaseLabel("LOCKED")).toMatch(/Team Lock/);
  });
});
