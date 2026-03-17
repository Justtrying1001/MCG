import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("contest flow language", () => {
  it("keeps contest detail fallback and login messaging in English", () => {
    const source = readFileSync("app/contests/[contestId]/page.tsx", "utf8");
    expect(source).toContain("Contest is unavailable or still being prepared.");
    expect(source).toContain("This contest is currently unavailable. Please try again in a few moments.");
    expect(source).toContain("Sign in to build and submit your lineup.");
    expect(source).not.toContain("Contest inaccessible ou en cours de préparation");
    expect(source).not.toContain("Ce contest n'est pas disponible");
    expect(source).not.toContain("Connectez-vous");
  });
});
