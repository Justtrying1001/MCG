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

  it("shows explicit env-lock message and activation instructions", () => {
    const source = readFileSync("components/admin/ResetUsersPanel.tsx", "utf8");
    expect(source).toContain("User reset is unavailable.");
    expect(source).toContain('ENABLE_USER_RESET must be \"true\"');
    expect(source).toContain("Set <code>ENABLE_USER_RESET=true</code> in Vercel Project Settings");
    expect(source).toContain("Environment locked");
  });

  it("uses session role and env flag to derive API/UI access", () => {
    const source = readFileSync("app/admin/(protected)/maintenance/reset-users/page.tsx", "utf8");
    expect(source).toContain("enabled={isSupervisor && resetFlag.enabled}");
    expect(source).toContain("resetFlagValue={resetFlag.displayValue}");
    expect(source).toContain("role={role}");
  });
});
