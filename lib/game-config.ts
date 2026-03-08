export const GAME_CONFIG = {
  STARTING_POINTS: 300,
  PACK_COST: 100,
  CARDS_PER_PACK: 5,
  PVE_DIFFICULTY: {
    easy: { enemyMult: 0.9, reward: 80 },
    normal: { enemyMult: 1.0, reward: 120 },
    hard: { enemyMult: 1.2, reward: 180 },
  },
} as const;
