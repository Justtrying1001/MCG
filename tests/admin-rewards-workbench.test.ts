import { describe, expect, it } from "vitest";

import {
  buildCompensationValidatePayload,
  isCompensationValidationBlocked,
  listBlockingCompensationIssues,
} from "@/lib/admin/rewards-workbench";

describe("admin rewards workbench helpers", () => {
  it("builds validate payload with top-level amount/reason fields", () => {
    expect(
      buildCompensationValidatePayload({
        userId: " u1 ",
        amount: 150,
        reasonLabel: " goodwill ",
        reasonCode: " OPS_CORRECTION ",
      })
    ).toEqual({
      userId: "u1",
      amount: 150,
      reasonLabel: "goodwill",
      reasonCode: "OPS_CORRECTION",
    });
  });

  it("detects blocking validation from blocking flag and ERROR issues", () => {
    const byFlag = { blocking: true, issues: [] };
    expect(isCompensationValidationBlocked(byFlag)).toBe(true);

    const byIssues = {
      blocking: false,
      issues: [
        { severity: "WARN", message: "minor" },
        { severity: "ERROR", message: "reasonLabel is required" },
      ],
    };

    expect(isCompensationValidationBlocked(byIssues)).toBe(true);
    expect(listBlockingCompensationIssues(byIssues)).toEqual(["reasonLabel is required"]);
  });
});
