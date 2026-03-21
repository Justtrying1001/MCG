"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { SessionProvider } from "@/components/session/SessionProvider";
import { InternalAnalyticsTracker } from "@/components/analytics/InternalAnalyticsTracker";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;
const solanaWalletConnectors = toSolanaWalletConnectors({ shouldAutoConnect: false });

export function RootProviders({ children }: { children: ReactNode }) {
  const hasPrivyConfig = Boolean(privyAppId && privyClientId);
  const resolvedPrivyAppId = privyAppId ?? "";
  const resolvedPrivyClientId = privyClientId ?? "";

  const content = hasPrivyConfig ? (
    <PrivyProvider
      appId={resolvedPrivyAppId}
      clientId={resolvedPrivyClientId}
      config={{
        appearance: {
          accentColor: "#c89b3c",
          theme: "dark",
          showWalletLoginFirst: false,
          walletChainType: "ethereum-and-solana",
          walletList: ["phantom", "solflare", "backpack", "wallet_connect"],
        },
        loginMethods: ["twitter"],
        externalWallets: {
          solana: {
            connectors: solanaWalletConnectors,
          },
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
      }}
    >
      {children}
    </PrivyProvider>
  ) : children;

  return <SessionProvider><InternalAnalyticsTracker />{content}</SessionProvider>;
}
