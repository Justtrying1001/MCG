DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'xUsername'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "xUsername" DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'xUserId'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "xUserId" DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'inviteCode'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "inviteCode" DROP NOT NULL;
  END IF;
END $$;
