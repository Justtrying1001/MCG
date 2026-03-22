ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "privyUserId" TEXT,
ADD COLUMN IF NOT EXISTS "xUsername" TEXT,
ADD COLUMN IF NOT EXISTS "xUserId" TEXT;

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
  )
WHERE "xUserId" IS NULL
   OR "xUserId" = ''
   OR "xUsername" IS NULL
   OR "xUsername" = '';

ALTER TABLE "User"
ALTER COLUMN "xUsername" SET NOT NULL,
ALTER COLUMN "xUserId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_privyUserId_key" ON "User"("privyUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_xUserId_key" ON "User"("xUserId");
