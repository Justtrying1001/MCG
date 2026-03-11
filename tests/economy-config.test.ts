import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/lib/game-config";
import { WELCOME_REWARD_POINTS } from "@/lib/domain/rewards/welcome";

describe("economy base configuration", () => {
  it("sets pack cost to 500 points", () => {
    expect(GAME_CONFIG.PACK_COST).toBe(500);
  });

  it("sets welcome reward to 500 points", () => {
    expect(WELCOME_REWARD_POINTS).toBe(500);
  });
});
