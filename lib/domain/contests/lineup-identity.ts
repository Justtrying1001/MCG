export type LineupIdentityCard = {
  tokenProjectId?: string | null;
  cardTemplateId?: string | null;
  instanceId?: string | null;
};

export function lineupIdentityKey(card: LineupIdentityCard): string {
  return card.tokenProjectId ?? card.cardTemplateId ?? card.instanceId ?? "";
}

export function findDuplicateLineupIdentityKeys(cards: LineupIdentityCard[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const card of cards) {
    const key = lineupIdentityKey(card);
    if (!key) continue;
    if (seen.has(key)) {
      duplicates.add(key);
      continue;
    }
    seen.add(key);
  }

  return [...duplicates];
}
