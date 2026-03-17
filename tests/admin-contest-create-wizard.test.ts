import { describe, expect, it } from "vitest";

import {
  BUILT_IN_CONTEST_COVERS,
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
