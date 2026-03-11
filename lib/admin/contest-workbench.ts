export type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

const ALLOWED_TRANSITIONS: Record<ContestStatus, ContestStatus[]> = {
  DRAFT: ["OPEN", "CANCELED"],
  OPEN: ["LOCKED", "CANCELED"],
  LOCKED: ["LIVE", "CANCELED"],
  LIVE: ["SETTLED", "CANCELED"],
  SETTLED: [],
  CANCELED: [],
};

export function getAllowedContestTransitions(current: ContestStatus): ContestStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

export function parseScoringRowsFromText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: Array<{ userId: string; score: number }> = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const parts = line.includes("\t") ? line.split("\t") : line.split(",");
    if (parts.length < 2) {
      errors.push(`line ${index + 1}: expected userId + score`);
      return;
    }
    const userId = parts[0]?.trim();
    const score = Number(parts[1]);
    if (!userId) {
      errors.push(`line ${index + 1}: missing userId`);
      return;
    }
    if (!Number.isFinite(score)) {
      errors.push(`line ${index + 1}: invalid score`);
      return;
    }
    rows.push({ userId, score });
  });

  return { rows, errors };
}

export function summarizeSettlementTotals(rows: Array<{ type: "POINTS" | "PACK" | "CARD_INSTANCE"; amount?: number }>) {
  return {
    usersCount: rows.length,
    rewardActionsCount: rows.length,
    pointsCreditTotal: rows.reduce((sum, row) => sum + (row.type === "POINTS" ? (row.amount ?? 0) : 0), 0),
  };
}

export function getContestOverviewProgress(input: { entries: number; rankings: number; settlements: number }) {
  return {
    entries: input.entries,
    scoringReady: input.entries > 0,
    rankingGenerated: input.rankings > 0,
    settlementDone: input.settlements > 0,
  };
}

export function lifecycleValidationState(validation: { blocking?: boolean; issues?: Array<{ severity?: string }> }) {
  const issues = validation.issues ?? [];
  const hasError = issues.some((issue) => issue.severity === "ERROR");
  return {
    canExecute: !validation.blocking && !hasError,
    hasError,
  };
}

export function buildContestAuditQuery(contestId: string) {
  const params = new URLSearchParams({
    module: "CONTESTS",
    targetType: "CONTEST",
    targetId: contestId,
    limit: "200",
  });
  return `/api/internal/admin-actions?${params.toString()}`;
}
