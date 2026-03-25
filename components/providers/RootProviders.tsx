"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { InternalAnalyticsTracker } from "@/components/analytics/InternalAnalyticsTracker";
import { SessionProvider } from "@/components/session/SessionProvider";
import {
  PRIVY_LOGIN_METHODS,
  PRIVY_SOLANA_WALLET_LIST,
  PRIVY_WALLET_CHAIN_TYPE,
} from "@/lib/privy-config";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const solanaConnectors = toSolanaWalletConnectors();

export function RootProviders({ children }: { children: ReactNode }) {
  const hasPrivyConfig = Boolean(privyAppId);

  const content = hasPrivyConfig ? (
    <PrivyProvider
      appId={privyAppId ?? ""}
      config={{
        appearance: {
          accentColor: "#c89b3c",
          theme: "dark",
          showWalletLoginFirst: true,
          walletChainType: PRIVY_WALLET_CHAIN_TYPE,
          walletList: [...PRIVY_SOLANA_WALLET_LIST],
        },
        walletConnectCloudProjectId: walletConnectProjectId,
        loginMethods: [...PRIVY_LOGIN_METHODS],
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
