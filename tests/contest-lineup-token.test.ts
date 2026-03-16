import { describe, expect, it } from "vitest";

import { getLogicalTokenKey, hasDuplicateLogicalTokens } from "@/lib/domain/contests/lineup-token";

describe("lineup logical token identity", () => {
  it("uses tokenProjectId as primary uniqueness key", () => {
    expect(getLogicalTokenKey({ tokenProjectId: "project-42", cardTemplateId: "template-a" })).toBe("project:project-42");
  });

  it("falls back to cardTemplateId when token project id is missing", () => {
    expect(getLogicalTokenKey({ tokenProjectId: null, cardTemplateId: "template-a" })).toBe("template:template-a");
  });

  it("detects duplicate logical tokens across different instances", () => {
    expect(
      hasDuplicateLogicalTokens([
        { tokenProjectId: "project-42", cardTemplateId: "template-a" },
        { tokenProjectId: "project-42", cardTemplateId: "template-b" },
      ])
    ).toBe(true);
  });

  it("allows different tokens", () => {
    expect(
      hasDuplicateLogicalTokens([
        { tokenProjectId: "project-42", cardTemplateId: "template-a" },
        { tokenProjectId: "project-99", cardTemplateId: "template-a" },
      ])
    ).toBe(false);
  });
});
