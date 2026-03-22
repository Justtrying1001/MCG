declare module "@privy-io/react-auth" {
  import type { ReactNode } from "react";

  export type PrivyLinkedAccount = {
    type: string;
    subject?: string;
    username?: string | null;
    name?: string | null;
    address?: string | null;
    chainType?: string | null;
    walletClientType?: string | null;
  };

  export type PrivyUser = {
    id: string;
    linkedAccounts: PrivyLinkedAccount[];
  };

  export function PrivyProvider(props: {
    appId: string;
    clientId?: string;
    config?: Record<string, unknown>;
    children: ReactNode;
  }): JSX.Element;

  export function usePrivy(): {
    ready: boolean;
    authenticated: boolean;
    user: PrivyUser | null;
    login: (options?: Record<string, unknown>) => void;
    logout: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
  };

  export function useLinkAccount(callbacks?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
  }): {
    linkWallet: (options?: Record<string, unknown>) => void;
    linkTwitter: (options?: Record<string, unknown>) => void;
  };
}

declare module "@privy-io/react-auth/solana" {
  export function toSolanaWalletConnectors(options?: { shouldAutoConnect?: boolean }): unknown;
}

declare module "@privy-io/server-auth" {
  export type LinkedAccountWithMetadata = {
    type: string;
    subject?: string;
    username?: string | null;
    address?: string | null;
    chainType?: string | null;
    walletClientType?: string | null;
  };

  export type User = {
    id: string;
    email?: { address?: string | null };
    phone?: { number?: string | null };
    twitter?: { subject?: string; username?: string | null } | null;
    profileImage?: string | null;
    linkedAccounts: LinkedAccountWithMetadata[];
  };

  export class PrivyClient {
    constructor(appId: string, appSecret: string, options?: Record<string, unknown>);
    verifyAuthToken(token: string): Promise<{ userId: string }>;
    getUserById(userId: string): Promise<User>;
  }
}
