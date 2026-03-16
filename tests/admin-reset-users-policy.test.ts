import { afterEach, describe, expect, it } from "vitest";

import { ADMIN_ROLES } from "@/lib/admin-ops";
import { getUserResetAvailability, getUserResetFeatureDisabledReason } from "@/lib/admin-reset-users";

describe("admin reset users policy", () => {
  const originalEnableUserReset = process.env.ENABLE_USER_RESET;

  afterEach(() => {
    if (originalEnableUserReset === undefined) {
      delete process.env.ENABLE_USER_RESET;
    } else {
      process.env.ENABLE_USER_RESET = originalEnableUserReset;
    }
  });

  it("returns explicit env reason when flag is not enabled", () => {
    process.env.ENABLE_USER_RESET = "false";
    expect(getUserResetFeatureDisabledReason()).toBe(
      "User reset is disabled because ENABLE_USER_RESET must be 'true' (current value: 'false').",
    );
  });

  it("enables reset only for supervisor when env is enabled", () => {
    process.env.ENABLE_USER_RESET = "true";
    expect(getUserResetAvailability(ADMIN_ROLES.ADMIN_SUPERVISOR, true)).toEqual({
      enabled: true,
      reasonCode: null,
      reason: null,
    });
  });

  it("rejects non-supervisor sessions", () => {
    process.env.ENABLE_USER_RESET = "true";
    expect(getUserResetAvailability(ADMIN_ROLES.ADMIN_OPS, true)).toEqual({
      enabled: false,
      reasonCode: "insufficient_role",
      reason: "User reset requires an ADMIN_SUPERVISOR session.",
    });
  });
});
