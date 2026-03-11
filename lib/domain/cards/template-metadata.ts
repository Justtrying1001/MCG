import type { Prisma } from "@prisma/client";

export function extractBaseCardIdFromTemplateMetadata(metadata: Prisma.JsonValue | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  const root = metadata as Record<string, unknown>;
  const legacy = root.legacy;

  if (typeof root.baseCardId === "string" && root.baseCardId.trim().length > 0) {
    return root.baseCardId;
  }

  if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
    const legacyBaseCardId = (legacy as Record<string, unknown>).baseCardId;
    if (typeof legacyBaseCardId === "string" && legacyBaseCardId.trim().length > 0) {
      return legacyBaseCardId;
    }
  }

  return null;
}

export function extractCoinGeckoIdFromTemplateMetadata(metadata: Prisma.JsonValue | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  const root = metadata as Record<string, unknown>;

  if (typeof root.coingeckoId === "string" && root.coingeckoId.trim().length > 0) {
    return root.coingeckoId;
  }

  const token = root.token;
  if (token && typeof token === "object" && !Array.isArray(token)) {
    const tokenCoingeckoId = (token as Record<string, unknown>).coingeckoId;
    if (typeof tokenCoingeckoId === "string" && tokenCoingeckoId.trim().length > 0) {
      return tokenCoingeckoId;
    }
  }

  const legacy = root.legacy;
  if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
    const legacyCoingeckoId = (legacy as Record<string, unknown>).coingeckoId;
    if (typeof legacyCoingeckoId === "string" && legacyCoingeckoId.trim().length > 0) {
      return legacyCoingeckoId;
    }
  }

  return null;
}
