ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "privyUserId" TEXT,
ADD COLUMN IF NOT EXISTS "xUserId" TEXT,
ADD COLUMN IF NOT EXISTS "xUsername" TEXT,
ADD COLUMN IF NOT EXISTS "displayName" TEXT,
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
ADD COLUMN IF NOT EXISTS "authProvider" TEXT,
ADD COLUMN IF NOT EXISTS "points" INTEGER,
ADD COLUMN IF NOT EXISTS "packsOpened" INTEGER,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "leagueId" TEXT;

UPDATE "User"
SET
  "xUsername" = COALESCE(
    NULLIF("xUsername", ''),
    CASE
      WHEN "privyUserId" IS NOT NULL THEN 'privy_' || COALESCE(NULLIF(LOWER(RIGHT(REGEXP_REPLACE("privyUserId", '[^a-zA-Z0-9]', '', 'g'), 12)), ''), 'user')
      WHEN "xUserId" IS NOT NULL AND "xUserId" LIKE 'privy:%' THEN 'privy_' || COALESCE(NULLIF(LOWER(RIGHT(REGEXP_REPLACE(SUBSTRING("xUserId" FROM 7), '[^a-zA-Z0-9]', '', 'g'), 12)), ''), 'user')
      ELSE 'legacy_' || SUBSTRING("id" FROM GREATEST(1, LENGTH("id") - 11))
    END
  ),
  "xUserId" = COALESCE(
    NULLIF("xUserId", ''),
    CASE
      WHEN "privyUserId" IS NOT NULL THEN 'privy:' || "privyUserId"
      WHEN COALESCE(NULLIF("xUsername", ''), '') <> '' THEN 'legacy-x:' || "xUsername" || ':' || "id"
      ELSE 'legacy-user:' || "id"
    END
  ),
  "displayName" = COALESCE(
    NULLIF("displayName", ''),
    NULLIF("xUsername", ''),
    CASE
      WHEN "privyUserId" IS NOT NULL THEN 'Privy User'
      ELSE 'MCG Player'
    END
  ),
  "authProvider" = COALESCE(
    NULLIF("authProvider", ''),
    CASE
      WHEN "privyUserId" IS NOT NULL THEN 'privy'
      ELSE 'x'
    END
  ),
  "points" = COALESCE("points", 300),
  "packsOpened" = COALESCE("packsOpened", 0),
  "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
  "updatedAt" = COALESCE("updatedAt", COALESCE("createdAt", CURRENT_TIMESTAMP))
WHERE "xUserId" IS NULL
   OR "xUserId" = ''
   OR "xUsername" IS NULL
   OR "xUsername" = ''
   OR "displayName" IS NULL
   OR "displayName" = ''
   OR "authProvider" IS NULL
   OR "authProvider" = ''
   OR "points" IS NULL
   OR "packsOpened" IS NULL
   OR "createdAt" IS NULL
   OR "updatedAt" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "xUserId" SET NOT NULL,
ALTER COLUMN "xUsername" SET NOT NULL,
ALTER COLUMN "displayName" SET NOT NULL,
ALTER COLUMN "authProvider" SET NOT NULL,
ALTER COLUMN "points" SET NOT NULL,
ALTER COLUMN "packsOpened" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "User"
ALTER COLUMN "authProvider" SET DEFAULT 'x',
ALTER COLUMN "points" SET DEFAULT 300,
ALTER COLUMN "packsOpened" SET DEFAULT 0,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "User_privyUserId_key" ON "User"("privyUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_xUserId_key" ON "User"("xUserId");
