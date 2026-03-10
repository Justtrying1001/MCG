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
