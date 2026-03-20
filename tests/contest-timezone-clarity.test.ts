import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("contest detail timezone clarity", () => {
  it("renders contest timestamps with explicit local and UTC labels", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");

    expect(source).toContain('function formatContestTimestamp');
    expect(source).toContain('(local) ·');
    expect(source).toContain('timeZone: "UTC"');
    expect(source).toContain('UTC`');
  });

  it("shows the exact closing or starting timestamp alongside countdown timers", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");

    expect(source).toContain('const countdownTimestampLabel = isLive ? "Closes at" : isLocked ? "Starts at" : "Closes at";');
    expect(source).toContain('helper: `${countdownTimestampLabel} ${countdownTimestampValue}`');
  });
});
