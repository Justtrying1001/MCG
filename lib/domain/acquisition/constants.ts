// Centralized acquisition constants to avoid ambiguous hardcoded pack codes across runtime/read models.
export const MVP_SALE_PACK_CODE = "genesis_sale_pack";
export const MVP_REWARD_PACK_CODE = "genesis_reward_pack";
export const MVP_CARD_SET_CODE = "GENESIS_SET_V1";

export const MVP_SALE_PACK_DEFAULTS = {
  displayName: "MCG Genesis Sale Pack",
  plannedPackCount: 10_000,
  cardsPerPack: 5,
} as const;

export const MVP_REWARD_PACK_TOTAL_SUPPLY = 6_000;
