import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("auth wallet login availability", () => {
  it("locks shared PrivyProvider methods to wallet + twitter only", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/providers/RootProviders.tsx"),
      "utf8",
    );
    expect(source).toContain('loginMethods: ["twitter", "wallet"]');
    expect(source).not.toContain('loginMethods: ["email"]');
  });

  it("configures Privy for Solana wallet login parity", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/providers/RootProviders.tsx"),
      "utf8",
    );
    expect(source).toContain('showWalletLoginFirst: false');
    expect(source).toContain('walletChainType: "solana-only"');
    expect(source).toContain(
      'walletList: ["phantom", "solflare", "backpack", "wallet_connect"]',
    );
    expect(source).toContain('connectors: solanaConnectors');
    expect(source).toContain('createOnLogin: "off"');
  });

  it("invokes Privy login with wallet + twitter only", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/auth/usePrivyLogin.ts"),
      "utf8",
    );
    expect(source).toContain('login({ loginMethods: ["wallet", "twitter"] })');
    expect(source).not.toContain('login({ loginMethods: ["twitter"] })');
  });
});
