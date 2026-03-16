import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin reset users UI", () => {
  it("requires RESET USERS confirmation phrase before enabling destructive action", () => {
    const source = readFileSync("components/admin/ResetUsersPanel.tsx", "utf8");
    expect(source).toContain("RESET USERS");
    expect(source).toContain("This action permanently deletes all user-related data.");
    expect(source).toContain("confirmInput.trim() === RESET_KEYWORD");
    expect(source).toContain("disabled={!canConfirm || pending}");
  });

  it("shows explicit unavailable reason when reset is disabled", () => {
    const source = readFileSync("components/admin/ResetUsersPanel.tsx", "utf8");
    expect(source).toContain("User reset is unavailable");
    expect(source).toContain("availability.reason");
  });

  it("uses shared availability resolver so page and API stay consistent", () => {
    const source = readFileSync("app/admin/(protected)/maintenance/reset-users/page.tsx", "utf8");
    expect(source).toContain("getUserResetAvailability");
    expect(source).toContain("<ResetUsersPanel availability={availability} />");
  });
});
