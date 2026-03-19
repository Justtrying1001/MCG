"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { SessionProvider } from "@/components/session/SessionProvider";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

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
        },
        loginMethods: ["twitter"],
      }}
    >
      {children}
    </PrivyProvider>
  ) : children;

  return <SessionProvider>{content}</SessionProvider>;
}
