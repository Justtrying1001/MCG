-- Identity model reset: move provider-specific fields off User into UserIdentity.
-- This migration is intended for test/alt environments where a DB reset is acceptable.

CREATE TYPE "UserIdentityProvider" AS ENUM ('PRIVY', 'TWITTER', 'WALLET_SOLANA');

ALTER TABLE "User"
ADD COLUMN "handle" TEXT;

CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "UserIdentityProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "walletAddress" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserIdentity_provider_providerUserId_key" ON "UserIdentity"("provider", "providerUserId");
CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");
CREATE INDEX "UserIdentity_provider_username_idx" ON "UserIdentity"("provider", "username");
CREATE INDEX "UserIdentity_provider_walletAddress_idx" ON "UserIdentity"("provider", "walletAddress");

ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" DROP COLUMN "privyUserId";
ALTER TABLE "User" DROP COLUMN "xUserId";
ALTER TABLE "User" DROP COLUMN "xUsername";
ALTER TABLE "User" DROP COLUMN "authProvider";
