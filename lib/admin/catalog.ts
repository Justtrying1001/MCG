export type ContestCatalogRowBase = {
  id: string;
  code: string;
  title: string;
  status: "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
};

export function filterContestCatalogRows<T extends ContestCatalogRowBase>(
  rows: T[],
  statusFilter: ContestCatalogRowBase["status"] | "ALL",
  query: string
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  return rows.filter((contest) => {
    if (statusFilter !== "ALL" && contest.status !== statusFilter) return false;
    if (!normalizedQuery) return true;
    return contest.code.toLowerCase().includes(normalizedQuery) || contest.title.toLowerCase().includes(normalizedQuery);
  });
}

export function buildContestSurfaceLinks(contestId: string) {
  return {
    overview: `/admin/contests/${contestId}`,
    lifecycle: `/admin/contests/${contestId}/lifecycle`,
    scoring: `/admin/contests/${contestId}/scoring`,
    settlement: `/admin/contests/${contestId}/settlement`,
    audit: `/admin/contests/${contestId}/audit`,
  };
}

export function buildQuestSurfaceLinks(questId: string) {
  return {
    library: "/admin/quests",
    detail: `/admin/quests/${questId}`,
    builderCreate: "/admin/quests/builder",
    builderEdit: `/admin/quests/builder?questId=${questId}`,
    moderationQueue: `/admin/moderation?questId=${questId}`,
    moderationHistory: `/admin/moderation/history?questId=${questId}`,
    legacy: "/admin/quests/legacy",
  };
}
