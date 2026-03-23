const MEMEDEX_FINISH_LABELS: Record<string, string> = {
  BASE: "Base",
  STANDARD: "Base",
  REVERSE: "Reverse",
  HOLO: "Holo",
  HOLOGRAPHIC: "Holo",
  HOLOGRAPHIQUE: "Holo",
  FULL_ART: "Full Art",
  MCG_ART: "Full Art",
  BRILLANTE: "Brillante",
};

export function formatMemedexFinish(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized) return "Unknown finish";
  if (MEMEDEX_FINISH_LABELS[normalized]) return MEMEDEX_FINISH_LABELS[normalized];

  return normalized
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
