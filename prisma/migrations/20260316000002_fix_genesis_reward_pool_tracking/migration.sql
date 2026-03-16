-- Keep reward pool tracking aligned with renamed reward pack code.
-- Contest validation resolves pool row by PackDefinition.code, so stale id=mvp_reward_pack
-- causes false REWARD_POOL_MISSING for genesis_reward_pack.

-- 1) Rename legacy tracked row if it exists.
UPDATE "RewardPackSupply"
SET "id" = 'genesis_reward_pack'
WHERE "id" = 'mvp_reward_pack'
  AND NOT EXISTS (
    SELECT 1
    FROM "RewardPackSupply" rp2
    WHERE rp2."id" = 'genesis_reward_pack'
  );

-- 2) Ensure a tracked row exists for all REWARD packs (including genesis_reward_pack).
INSERT INTO "RewardPackSupply" ("id", "totalSupply", "distributed", "lastUpdatedAt", "createdAt")
SELECT
  pd."code" AS id,
  GREATEST(pd."plannedPackCount", 0) AS "totalSupply",
  LEAST(
    (
      SELECT COUNT(*)::INTEGER
      FROM "RewardGrant" rg
      WHERE rg."type" = 'PACK'
        AND rg."packDefinitionId" = pd."id"
    ),
    GREATEST(pd."plannedPackCount", 0)
  ) AS "distributed",
  NOW(),
  NOW()
FROM "PackDefinition" pd
WHERE pd."source" = 'REWARD'
ON CONFLICT ("id") DO UPDATE
SET
  "totalSupply" = EXCLUDED."totalSupply",
  "distributed" = LEAST(EXCLUDED."distributed", EXCLUDED."totalSupply"),
  "lastUpdatedAt" = NOW();
