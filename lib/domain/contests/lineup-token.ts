type LineupTokenIdentity = {
  tokenProjectId?: string | null;
  cardTemplateId: string;
};

export function getLogicalTokenKey(identity: LineupTokenIdentity): string {
  const tokenProjectId = identity.tokenProjectId?.trim();
  if (tokenProjectId) {
    return `project:${tokenProjectId}`;
  }

  return `template:${identity.cardTemplateId}`;
}

export function hasDuplicateLogicalTokens(identities: LineupTokenIdentity[]): boolean {
  const seen = new Set<string>();
  for (const identity of identities) {
    const key = getLogicalTokenKey(identity);
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
  }
  return false;
}

