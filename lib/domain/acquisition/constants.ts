// Centralized acquisition constants to avoid ambiguous hardcoded pack codes across runtime/read models.
export const MVP_SALE_PACK_CODE = "mvp_sale_pack";
export const MVP_REWARD_PACK_CODE = "mvp_reward_pack";
export const MVP_CARD_SET_CODE = "MVP_SET_V1";

export const MVP_SALE_PACK_DEFAULTS = {
  displayName: "MCG MVP Sale Pack",
  plannedPackCount: 10_000,
  cardsPerPack: 5,
} as const;
