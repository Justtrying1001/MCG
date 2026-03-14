-- Reward pack supply tracking with hard cap at 6,000.
CREATE TABLE "RewardPackSupply" (
  "id" TEXT NOT NULL,
  "totalSupply" INTEGER NOT NULL,
  "distributed" INTEGER NOT NULL DEFAULT 0,
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardPackSupply_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RewardPackSupply_totalSupply_fixed" CHECK ("totalSupply" = 6000),
  CONSTRAINT "RewardPackSupply_distributed_non_negative" CHECK ("distributed" >= 0),
  CONSTRAINT "RewardPackSupply_distributed_within_total" CHECK ("distributed" <= "totalSupply")
);

INSERT INTO "RewardPackSupply" ("id", "totalSupply", "distributed", "lastUpdatedAt", "createdAt")
SELECT
  'mvp_reward_pack',
  6000,
  LEAST(COUNT(*)::INTEGER, 6000),
  COALESCE(MAX(rg."createdAt"), NOW()),
  NOW()
FROM "RewardGrant" rg
INNER JOIN "PackDefinition" pd ON pd."id" = rg."packDefinitionId"
WHERE rg."type" = 'PACK'
  AND pd."source" = 'REWARD'
ON CONFLICT ("id") DO UPDATE
SET
  "totalSupply" = 6000,
  "distributed" = EXCLUDED."distributed",
  "lastUpdatedAt" = NOW();


UPDATE "PackDefinition"
SET "plannedPackCount" = 6000
WHERE "code" = 'mvp_reward_pack' AND "source" = 'REWARD';
