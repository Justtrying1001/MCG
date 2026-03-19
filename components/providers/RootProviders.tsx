"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { SessionProvider } from "@/components/session/SessionProvider";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

type RootProvidersDebugState = {
  hasPrivyAppId: boolean;
  hasPrivyClientId: boolean;
  privyProviderMounted: boolean;
  windowType: string;
};

const RootProvidersDebugContext = createContext<RootProvidersDebugState>({
  hasPrivyAppId: false,
  hasPrivyClientId: false,
  privyProviderMounted: false,
  windowType: "undefined",
});

export function useRootProvidersDebug() {
  return useContext(RootProvidersDebugContext);
}

export function RootProviders({ children }: { children: ReactNode }) {
  const hasPrivyConfig = Boolean(privyAppId && privyClientId);
  const resolvedPrivyAppId = privyAppId ?? "";
  const resolvedPrivyClientId = privyClientId ?? "";
  const debugState = useMemo<RootProvidersDebugState>(() => ({
    hasPrivyAppId: Boolean(privyAppId),
    hasPrivyClientId: Boolean(privyClientId),
    privyProviderMounted: hasPrivyConfig,
    windowType: typeof window,
  }), [hasPrivyConfig]);

  useEffect(() => {
    console.info("[RootProviders] Privy debug", {
      appId: privyAppId ?? null,
      clientId: privyClientId ?? null,
      typeofWindow: typeof window,
      privyProviderMounted: hasPrivyConfig,
    });
  }, [hasPrivyConfig]);

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

  return (
    <RootProvidersDebugContext.Provider value={debugState}>
      <SessionProvider>{content}</SessionProvider>
    </RootProvidersDebugContext.Provider>
  );
}
