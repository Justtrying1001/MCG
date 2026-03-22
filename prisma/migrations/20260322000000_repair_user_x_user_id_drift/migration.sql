ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "xUserId" TEXT;

DO $$
DECLARE
  has_privy_user_id boolean;
  has_x_username boolean;
  backfill_sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'privyUserId'
  ) INTO has_privy_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'xUsername'
  ) INTO has_x_username;

  backfill_sql := 'UPDATE "User" SET "xUserId" = CASE ';

  IF has_privy_user_id THEN
    backfill_sql := backfill_sql || 'WHEN "privyUserId" IS NOT NULL THEN ''privy:'' || "privyUserId" ';
  END IF;

  IF has_x_username THEN
    backfill_sql := backfill_sql || 'WHEN COALESCE(NULLIF("xUsername", ''''), '''') <> '''' THEN ''legacy-x:'' || "xUsername" || '':'' || "id" ';
  END IF;

  backfill_sql := backfill_sql || 'ELSE ''legacy-user:'' || "id" END WHERE "xUserId" IS NULL';

  EXECUTE backfill_sql;
END $$;

ALTER TABLE "User"
ALTER COLUMN "xUserId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_xUserId_key" ON "User"("xUserId");
