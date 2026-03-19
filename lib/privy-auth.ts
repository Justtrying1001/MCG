import { PrivyClient, type LinkedAccountWithMetadata, type User as PrivyUser } from "@privy-io/server-auth";

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

export type ResolvedPrivyIdentity = {
  privyUserId: string;
  twitterUserId: string | null;
  twitterUsername: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  privyUser: PrivyUser;
};

function getTwitterAccount(user: PrivyUser) {
  return (user.twitter ?? user.linkedAccounts.find((account): account is Extract<LinkedAccountWithMetadata, { type: "twitter_oauth" }> => account.type === "twitter_oauth")) ?? null;
}

function getDisplayName(user: PrivyUser, twitterUsername: string | null) {
  if (twitterUsername) return twitterUsername;
  if (user.email?.address) return user.email.address;
  if (user.phone?.number) return user.phone.number;
  return null;
}

export async function resolvePrivyIdentityFromAccessToken(accessToken: string): Promise<ResolvedPrivyIdentity> {
  const client = getPrivyServerClient();
  const claims = await client.verifyAuthToken(accessToken);
  const privyUser = await client.getUserById(claims.userId);
  const twitterAccount = getTwitterAccount(privyUser);

  return {
    privyUserId: claims.userId,
    twitterUserId: twitterAccount?.subject ?? null,
    twitterUsername: twitterAccount?.username ?? null,
    displayName: getDisplayName(privyUser, twitterAccount?.username ?? null),
    avatarUrl: null,
    privyUser,
  };
}
