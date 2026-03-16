-- Add pack reward fields to QuestDefinition
ALTER TABLE "QuestDefinition"
  ADD COLUMN IF NOT EXISTS "rewardPackDefinitionId" TEXT REFERENCES "PackDefinition"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "rewardPackQuantity"     INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "QuestDefinition_rewardPackDefinitionId_idx" ON "QuestDefinition"("rewardPackDefinitionId");
