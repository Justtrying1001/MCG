-- Rebalance MVP pack supply split while keeping total pack supply at 16,000.
UPDATE "PackDefinition"
SET "plannedPackCount" = 10000,
    "updatedAt" = NOW()
WHERE "code" = 'mvp_sale_pack';

UPDATE "PackDefinition"
SET "plannedPackCount" = 6000,
    "updatedAt" = NOW()
WHERE "code" = 'mvp_reward_pack';
