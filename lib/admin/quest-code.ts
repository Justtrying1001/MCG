export function buildQuestCodeBase(seed: string | null | undefined) {
  const raw = String(seed ?? "").trim();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  const withPrefix = normalized ? `Q_${normalized}` : "Q_QUEST";
  return withPrefix.slice(0, 64);
}
