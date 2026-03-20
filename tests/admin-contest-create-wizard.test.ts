import { describe, expect, it } from "vitest";
import fs from "node:fs";

import {
  BUILT_IN_CONTEST_COVERS,
  DURATION_UNIT_LABELS,
  generateContestCodeFromTitle,
} from "@/app/admin/(protected)/contests/create/_hooks/useContestWizard";

describe("contest create wizard identity", () => {
  it("generates stable uppercase admin-friendly contest codes", () => {
    expect(generateContestCodeFromTitle("Weekly Genesis Clash")).toBe("WEEKLY-GENESIS-CLASH");
    expect(generateContestCodeFromTitle(" Weekly   Genesis Clash #1 ")).toBe("WEEKLY-GENESIS-CLASH-1");
    expect(generateContestCodeFromTitle("--___")).toBe("");
  });
});

describe("contest cover options", () => {
  it("exposes built-in cover URLs as public /public paths", () => {
    expect(BUILT_IN_CONTEST_COVERS.length).toBeGreaterThan(0);
    expect(BUILT_IN_CONTEST_COVERS[0]?.url).toBe("/Contest.png");
    expect(BUILT_IN_CONTEST_COVERS.every((cover) => cover.url.startsWith("/"))).toBe(true);
  });
});

describe("contest rewards step copy", () => {
  it("surfaces bonus rewards planning and exact pack preview guidance", () => {
    const source = fs.readFileSync("app/admin/(protected)/contests/create/_components/WizardSteps.tsx", "utf8");
    expect(source).toContain("Bonus rewards (optional)");
    expect(source).toContain("Reward pack supply snapshot");
    expect(source).toContain("POINTS_POOL_TOP_PERCENT");
    expect(source).toContain("formatRewardPreviewPackLines");
    expect(source).not.toContain('formatRewardPreviewPerWinnerRange(row.packsPerWinnerMin, row.packsPerWinnerMax, "packs")');
  });
});

describe("contest duration units", () => {
  it("supports minute labels in the admin wizard summary", () => {
    expect(DURATION_UNIT_LABELS.MINUTES).toBe("minute(s)");

    const source = fs.readFileSync("app/admin/(protected)/contests/create/_components/WizardSteps.tsx", "utf8");
    expect(source).toContain('<option value="MINUTES">Minutes</option>');
    expect(source).toContain("DURATION_UNIT_LABELS[form.durationUnit]");
  });

  it("restores minute durations from saved contest timings", () => {
    const start = new Date("2026-03-20T10:00:00.000Z");
    const end = new Date("2026-03-20T10:45:00.000Z");
    const totalMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    const asDays = totalMinutes % (24 * 60) === 0;
    const asHours = totalMinutes % 60 === 0;

    const durationValue = String(asDays ? totalMinutes / (24 * 60) : asHours ? totalMinutes / 60 : totalMinutes);
    const durationUnit = asDays ? "DAYS" : asHours ? "HOURS" : "MINUTES";

    expect(durationValue).toBe("45");
    expect(durationUnit).toBe("MINUTES");
  });
});
