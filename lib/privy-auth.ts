import { PrivyClient, type LinkedAccountWithMetadata, type User as PrivyUser } from "@privy-io/server-auth";
import { UserIdentityProvider } from "@prisma/client";

let privyClientSingleton: PrivyClient | null = null;

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

export function getPrivyServerClient() {
  if (!privyClientSingleton) {
    privyClientSingleton = new PrivyClient(
      requireEnv("NEXT_PUBLIC_PRIVY_APP_ID"),
      requireEnv("PRIVY_APP_SECRET"),
    );
  }

  return privyClientSingleton;
}

export type ResolvedIdentityAccount = {
  provider: UserIdentityProvider;
  providerUserId: string;
  username: string | null;
  displayName: string | null;
  walletAddress: string | null;
  isPrimary: boolean;
  metadata?: Record<string, unknown>;
};

export type ResolvedPrivyIdentity = {
  privyUserId: string;
  displayName: string | null;
  avatarUrl: string | null;
  privyUser: PrivyUser;
  identities: ResolvedIdentityAccount[];
};

function getDisplayName(user: PrivyUser, fallbackUsername: string | null) {
  if (fallbackUsername) return fallbackUsername;
  if (user.email?.address) return user.email.address;
  if (user.phone?.number) return user.phone.number;
  return null;
}

function isTwitterAccount(account: LinkedAccountWithMetadata) {
  return account.type === "twitter_oauth";
}

function isSolanaWalletAccount(account: LinkedAccountWithMetadata) {
  return account.type === "wallet" && (account.chainType === "solana" || typeof account.address === "string");
}

function normalizeWalletAddress(address: string | null | undefined) {
  const trimmed = address?.trim();
  return trimmed ? trimmed : null;
}

function buildIdentityAccounts(user: PrivyUser, privyUserId: string): ResolvedIdentityAccount[] {
  const linkedAccounts = Array.isArray(user.linkedAccounts) ? user.linkedAccounts : [];
  const twitterAccount = user.twitter ?? linkedAccounts.find(isTwitterAccount) ?? null;
  const identities: ResolvedIdentityAccount[] = [
    {
      provider: UserIdentityProvider.PRIVY,
      providerUserId: privyUserId,
      username: null,
      displayName: getDisplayName(user, twitterAccount?.username ?? null),
      walletAddress: null,
      isPrimary: true,
      metadata: undefined,
    },
  ];

  if (twitterAccount?.subject) {
    identities.push({
      provider: UserIdentityProvider.TWITTER,
      providerUserId: twitterAccount.subject,
      username: twitterAccount.username ?? null,
      displayName: twitterAccount.username ?? null,
      walletAddress: null,
      isPrimary: false,
      metadata: undefined,
    });
  }

  for (const account of linkedAccounts) {
    if (!isSolanaWalletAccount(account)) continue;
    const walletAddress = normalizeWalletAddress(account.address);
    const providerUserId = walletAddress ?? normalizeWalletAddress(account.subject);
    if (!providerUserId) continue;

    identities.push({
      provider: UserIdentityProvider.WALLET_SOLANA,
      providerUserId,
      username: null,
      displayName: null,
      walletAddress,
      isPrimary: false,
      metadata: {
        chainType: account.chainType ?? null,
        walletClientType: account.walletClientType ?? null,
      },
    });
  }

  return identities;
}

export async function resolvePrivyIdentityFromAccessToken(accessToken: string): Promise<ResolvedPrivyIdentity> {
  const client = getPrivyServerClient();
  const claims = await client.verifyAuthToken(accessToken);
  const privyUser = await client.getUserById(claims.userId);
  const identities = buildIdentityAccounts(privyUser, claims.userId);
  const twitterIdentity = identities.find((identity) => identity.provider === UserIdentityProvider.TWITTER) ?? null;

  return {
    privyUserId: claims.userId,
    displayName: getDisplayName(privyUser, twitterIdentity?.username ?? null),
    avatarUrl: typeof privyUser.profileImage === "string" ? privyUser.profileImage : null,
    privyUser,
    identities,
  };
}
