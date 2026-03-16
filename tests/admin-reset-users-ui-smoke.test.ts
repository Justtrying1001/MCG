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

  it("uses session username role resolution for supervisor gating", () => {
    const source = readFileSync("app/admin/(protected)/maintenance/reset-users/page.tsx", "utf8");
    expect(source).toContain("resolveSessionAdminRole(session?.username ?? null)");
    expect(source).toContain("<ResetUsersPanel enabled={isSupervisor} />");
  });

});
