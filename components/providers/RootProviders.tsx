"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { SessionProvider } from "@/components/session/SessionProvider";
import { InternalAnalyticsTracker } from "@/components/analytics/InternalAnalyticsTracker";
import {
  PRIVY_PROVIDER_LOGIN_METHODS,
  PRIVY_SOLANA_WALLET_LIST,
  PRIVY_WALLET_CHAIN_TYPE,
} from "@/lib/privy-config";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const solanaConnectors = toSolanaWalletConnectors();

export function RootProviders({ children }: { children: ReactNode }) {
  const hasPrivyConfig = Boolean(privyAppId && privyClientId);
  const resolvedPrivyAppId = privyAppId ?? "";
  const resolvedPrivyClientId = privyClientId ?? "";

  if (
    process.env.NODE_ENV !== "production" &&
    hasPrivyConfig &&
    !walletConnectProjectId
  ) {
    console.warn(
      "[Privy] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing. Mobile wallet fallback may not work.",
    );
  }

  const content = hasPrivyConfig ? (
    <PrivyProvider
      appId={resolvedPrivyAppId}
      clientId={resolvedPrivyClientId}
      config={{
        appearance: {
          accentColor: "#c89b3c",
          theme: "dark",
          showWalletLoginFirst: true,
          walletChainType: PRIVY_WALLET_CHAIN_TYPE,
          walletList: [...PRIVY_SOLANA_WALLET_LIST],
        },
        walletConnectCloudProjectId: walletConnectProjectId,
        loginMethods: [...PRIVY_PROVIDER_LOGIN_METHODS],
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
