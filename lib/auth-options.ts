import type { NextAuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";

const twitterClientId = process.env.TWITTER_CLIENT_ID || process.env.AUTH_TWITTER_ID || "";
const twitterClientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.AUTH_TWITTER_SECRET || "";
const isTwitterAuthEnabled = Boolean(twitterClientId && twitterClientSecret);

if (!isTwitterAuthEnabled) {
  console.warn("Twitter auth disabled: missing TWITTER_CLIENT_ID/AUTH_TWITTER_ID or TWITTER_CLIENT_SECRET/AUTH_TWITTER_SECRET.");
}

function extractTwitterUsername(profile: unknown): string {
  if (!profile || typeof profile !== "object") return "twitter_user";

  const data = (profile as { data?: { username?: string } }).data;
  if (data?.username) return data.username;

  const username = (profile as { username?: string }).username;
  if (username) return username;

  return "twitter_user";
}

export const authOptions: NextAuthOptions = {
  providers: isTwitterAuthEnabled
    ? [
        TwitterProvider({
          clientId: twitterClientId,
          clientSecret: twitterClientSecret,
          version: "2.0",
        }),
      ]
    : [],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "twitter") {
        token.twitterId = account.providerAccountId;
        token.twitterUsername = extractTwitterUsername(profile);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.twitterId = (token.twitterId as string) || "";
      }
      return session;
    },
    async signIn({ account, profile }) {
      if (!account || account.provider !== "twitter") return false;

      const twitterId = account.providerAccountId;
      const baseUsername = extractTwitterUsername(profile);

      let username = baseUsername;
      let suffix = 1;

      while (true) {
        const existingByName = await prisma.user.findUnique({ where: { username } });
        if (!existingByName || existingByName.twitterId === twitterId) break;
        suffix += 1;
        username = `${baseUsername}_${suffix}`;
      }

      await prisma.user.upsert({
        where: { twitterId },
        update: { username },
        create: { twitterId, username },
      });

      return true;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
