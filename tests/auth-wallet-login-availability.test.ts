import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("auth wallet login availability", () => {
  it("defines a shared Solana wallet list with WalletConnect mobile fallback", () => {
    const source = readSource("lib/privy-config.ts");
    expect(source).toMatch(/PRIVY_SOLANA_WALLET_LIST\s*=\s*\[[\s\S]*"phantom"[\s\S]*"solflare"[\s\S]*"backpack"[\s\S]*"wallet_connect"[\s\S]*\]/);
    expect(source).toContain('PRIVY_WALLET_CHAIN_TYPE = "solana-only"');
    expect(source).toContain('PRIVY_PROVIDER_LOGIN_METHODS = ["twitter", "wallet"]');
    expect(source).toContain('PRIVY_TRIGGER_LOGIN_METHODS = ["wallet", "twitter"]');
  });

  it("locks shared PrivyProvider methods to wallet + twitter only", () => {
    const source = readSource("components/providers/RootProviders.tsx");
    expect(source).toContain("PRIVY_PROVIDER_LOGIN_METHODS");
    expect(source).toContain("showWalletLoginFirst: true");
    expect(source).toContain("walletChainType: PRIVY_WALLET_CHAIN_TYPE");
    expect(source).toContain("walletList: [...PRIVY_SOLANA_WALLET_LIST]");
    expect(source).toContain('loginMethods: [...PRIVY_PROVIDER_LOGIN_METHODS]');
    expect(source).toContain('connectors: solanaConnectors');
    expect(source).toContain('createOnLogin: "off"');
    expect(source).not.toContain('loginMethods: ["email"]');
  });

  it("invokes Privy login trigger with wallet first and Solana-only wallets", () => {
    const source = readSource("components/auth/usePrivyLogin.ts");
    expect(source).toContain("PRIVY_TRIGGER_LOGIN_METHODS");
    expect(source).toContain("loginMethods: [...PRIVY_TRIGGER_LOGIN_METHODS]");
    expect(source).toContain("walletChainType: PRIVY_WALLET_CHAIN_TYPE");
    expect(source).toContain("walletList: [...PRIVY_SOLANA_WALLET_LIST]");
    expect(source).not.toContain('wallet_connect_qr_solana');
  });

  it("uses the same Solana wallet list for wallet linking", () => {
    const source = readSource("components/profile/SolanaWalletCard.tsx");
    expect(source).toContain("walletChainType: PRIVY_WALLET_CHAIN_TYPE");
    expect(source).toContain("walletList: [...PRIVY_SOLANA_WALLET_LIST]");
  });
});
