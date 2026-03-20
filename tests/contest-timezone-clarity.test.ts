import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("contest detail timezone clarity", () => {
  it("renders contest timestamps in explicit UTC only", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");

    expect(source).toContain('const UTC_DATE_TIME_FORMATTER');
    expect(source).toContain('timeZone: "UTC"');
    expect(source).toContain('return `${UTC_DATE_TIME_FORMATTER.format(new Date(iso))} UTC`;');
    expect(source).not.toContain('(local) ·');
  });

  it("shows the exact closing or starting UTC timestamp alongside countdown timers", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");

    expect(source).toContain('const countdownTimestampLabel = isLive ? "Closes at" : isLocked ? "Starts at" : "Closes at";');
    expect(source).toContain('helper: `${countdownTimestampLabel} ${countdownTimestampValue}`');
  });
});
