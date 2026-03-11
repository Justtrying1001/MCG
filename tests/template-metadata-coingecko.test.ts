import { describe, expect, it } from "vitest";

import { extractCoinGeckoIdFromTemplateMetadata } from "@/lib/domain/cards/template-metadata";

describe("extractCoinGeckoIdFromTemplateMetadata", () => {
  it("reads top-level coingeckoId", () => {
    expect(extractCoinGeckoIdFromTemplateMetadata({ coingeckoId: "dogecoin" } as any)).toBe("dogecoin");
  });

  it("falls back to token and legacy blocks", () => {
    expect(extractCoinGeckoIdFromTemplateMetadata({ token: { coingeckoId: "pepe" } } as any)).toBe("pepe");
    expect(extractCoinGeckoIdFromTemplateMetadata({ legacy: { coingeckoId: "bonk" } } as any)).toBe("bonk");
  });

  it("returns null when absent", () => {
    expect(extractCoinGeckoIdFromTemplateMetadata(null as any)).toBeNull();
    expect(extractCoinGeckoIdFromTemplateMetadata({} as any)).toBeNull();
  });
});
