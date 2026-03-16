export const GAME_CONFIG = {
  STARTING_POINTS: 500,
  PACK_COST: 500,
  CARDS_PER_PACK: 5,
  GENESIS_SET: {
    TOKEN_COUNT: 25,
    CARDS_PER_TOKEN: 3200,
    PACK_COUNT: 16000,
    DISPLAY_NAME: "Set 1 · Genesis",
  },
  PVE_DIFFICULTY: {
    easy: { enemyMult: 0.9, reward: 80 },
    normal: { enemyMult: 1.0, reward: 120 },
    hard: { enemyMult: 1.2, reward: 180 },
  },
} as const;

export const GAME_DERIVED_STATS = {
  TOTAL_PLANNED_CARDS: GAME_CONFIG.GENESIS_SET.TOKEN_COUNT * GAME_CONFIG.GENESIS_SET.CARDS_PER_TOKEN,
  TOTAL_PACK_CARD_CAPACITY: GAME_CONFIG.GENESIS_SET.PACK_COUNT * GAME_CONFIG.CARDS_PER_PACK,
} as const;
