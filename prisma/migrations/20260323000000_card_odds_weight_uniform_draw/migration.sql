ALTER TABLE "CardTemplate"
ADD COLUMN     "oddsWeight" INTEGER NOT NULL DEFAULT 1;

UPDATE "CardTemplate" AS ct
SET "oddsWeight" = GREATEST(1, COALESCE(r."weight", 1) * COALESCE(e."weight", 1))
FROM "Rarity" AS r, "Edition" AS e
WHERE r.id = ct."rarityId"
  AND e.id = ct."editionId";
