-- Rename the card set from MVP_SET_V1 to GENESIS_SET_V1
UPDATE "CardSet"
SET code = 'GENESIS_SET_V1', "displayName" = 'MCG MVP Genesis'
WHERE code = 'MVP_SET_V1';

-- Rename the sale pack
UPDATE "PackDefinition"
SET code = 'genesis_sale_pack', "displayName" = 'MCG Genesis Sale Pack'
WHERE code = 'mvp_sale_pack';

-- Rename the reward pack
UPDATE "PackDefinition"
SET code = 'genesis_reward_pack', "displayName" = 'MCG Genesis Reward Pack'
WHERE code = 'mvp_reward_pack';
