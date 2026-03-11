import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type BaseCardRow = {
  baseCardId?: string;
  coingeckoId?: string | null;
  isEligible?: boolean;
  marketCapRank?: number | null;
};

type ProjectRow = {
  projectId?: string;
  coingeckoId?: string | null;
  isEligible?: boolean;
};

describe("CoinGecko mapping coverage", () => {
  it("ensures top-50 eligible cards have coingeckoId", () => {
    const cardsPath = path.join(process.cwd(), "mcg_base_cards.json");
    const cards = JSON.parse(readFileSync(cardsPath, "utf8")) as BaseCardRow[];

    const eligible = cards
      .filter((card) => card?.isEligible !== false)
      .sort((a, b) => {
        const rankA = Number.isFinite(a.marketCapRank) ? Number(a.marketCapRank) : Number.MAX_SAFE_INTEGER;
        const rankB = Number.isFinite(b.marketCapRank) ? Number(b.marketCapRank) : Number.MAX_SAFE_INTEGER;
        return rankA - rankB;
      })
      .slice(0, 50);

    expect(eligible).toHaveLength(50);
    const missing = eligible.filter((card) => !card.coingeckoId || !String(card.coingeckoId).trim());
    expect(missing).toHaveLength(0);
  });

  it("ensures all project rows include coingeckoId", () => {
    const projectsPath = path.join(process.cwd(), "mcg_projects.json");
    const projects = JSON.parse(readFileSync(projectsPath, "utf8")) as ProjectRow[];

    const missing = projects.filter((project) => !project.coingeckoId || !String(project.coingeckoId).trim());
    expect(missing).toHaveLength(0);
  });
});
