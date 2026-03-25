"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { SessionProvider } from "@/components/session/SessionProvider";
import { InternalAnalyticsTracker } from "@/components/analytics/InternalAnalyticsTracker";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;
const solanaConnectors = toSolanaWalletConnectors();

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
          walletChainType: "solana-only",
          walletList: ["phantom", "solflare", "backpack"],
        },
        loginMethods: ["twitter", "wallet"],
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "off",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  ) : (
    children
  );

  return (
    <SessionProvider>
      <InternalAnalyticsTracker />
      {content}
    </SessionProvider>
  );
}
