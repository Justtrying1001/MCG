-- Disable "Genesis Booster Base Pack v1" and any booster packs from supply.
-- We do NOT delete (preserve historical data) — just deactivate and zero out plannedPackCount.
UPDATE "PackDefinition"
SET "isActive" = false, "plannedPackCount" = 0
WHERE "code" LIKE '%booster%' OR "displayName" LIKE '%Booster%' OR "displayName" LIKE '%booster%';
