ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "xUserId" TEXT;

DO $$
DECLARE
  has_privy_user_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'privyUserId'
  ) INTO has_privy_user_id;

  IF has_privy_user_id THEN
    EXECUTE $update_with_privy$
      UPDATE "User"
      SET "xUserId" = CASE
        WHEN "privyUserId" IS NOT NULL THEN 'privy:' || "privyUserId"
        WHEN COALESCE(NULLIF("xUsername", ''), '') <> '' THEN 'legacy-x:' || "xUsername" || ':' || "id"
        ELSE 'legacy-user:' || "id"
      END
      WHERE "xUserId" IS NULL
    $update_with_privy$;
  ELSE
    EXECUTE $update_without_privy$
      UPDATE "User"
      SET "xUserId" = CASE
        WHEN COALESCE(NULLIF("xUsername", ''), '') <> '' THEN 'legacy-x:' || "xUsername" || ':' || "id"
        ELSE 'legacy-user:' || "id"
      END
      WHERE "xUserId" IS NULL
    $update_without_privy$;
  END IF;
END $$;

ALTER TABLE "User"
ALTER COLUMN "xUserId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_xUserId_key" ON "User"("xUserId");
