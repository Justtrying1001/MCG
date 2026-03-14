-- Add referral invite code to users
ALTER TABLE "User" ADD COLUMN "inviteCode" TEXT;

UPDATE "User"
SET "inviteCode" = UPPER(CONCAT('MCG', SUBSTRING(REPLACE("id", '-', ''), 1, 8)))
WHERE "inviteCode" IS NULL;

ALTER TABLE "User" ALTER COLUMN "inviteCode" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_inviteCode_key" UNIQUE ("inviteCode");

-- Track inviter/invitee relationships
CREATE TABLE "UserInvite" (
  "id" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "inviteeId" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserInvite_inviteeId_key" ON "UserInvite"("inviteeId");
CREATE UNIQUE INDEX "UserInvite_inviterId_inviteeId_key" ON "UserInvite"("inviterId", "inviteeId");
CREATE INDEX "UserInvite_inviterId_idx" ON "UserInvite"("inviterId");
CREATE INDEX "UserInvite_inviteCode_idx" ON "UserInvite"("inviteCode");

ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
