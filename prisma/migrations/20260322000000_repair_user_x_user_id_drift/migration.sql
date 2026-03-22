ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "xUserId" TEXT;

UPDATE "User"
SET "xUserId" = CASE
  WHEN "privyUserId" IS NOT NULL THEN 'privy:' || "privyUserId"
  WHEN COALESCE(NULLIF("xUsername", ''), '') <> '' THEN 'legacy-x:' || "xUsername" || ':' || "id"
  ELSE 'legacy-user:' || "id"
END
WHERE "xUserId" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "xUserId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_xUserId_key" ON "User"("xUserId");
