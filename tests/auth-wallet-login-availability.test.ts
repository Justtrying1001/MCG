import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("auth wallet login availability", () => {
  it("does not lock PrivyProvider to twitter-only login", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/providers/RootProviders.tsx"), "utf8");
    expect(source).not.toContain('loginMethods: ["twitter"]');
  });

  it("does not force twitter-only login in usePrivyLogin", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/auth/usePrivyLogin.ts"), "utf8");
    expect(source).not.toContain('login({ loginMethods: ["twitter"] })');
    expect(source).toContain("login();");
  });
});
