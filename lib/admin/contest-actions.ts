export type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

export type ContestOperationCounts = {
  entries: number;
  scores: number;
  rankings: number;
  settlements: number;
};

function hasOperations(counts: ContestOperationCounts) {
  return counts.entries > 0 || counts.scores > 0 || counts.rankings > 0 || counts.settlements > 0;
}

export function getStopActionState(status: ContestStatus) {
  if (status === "CANCELED") {
    return { allowed: false, reason: "Contest is already canceled." };
  }
  if (status === "SETTLED") {
    return { allowed: false, reason: "Contest is already settled. Use archive for cleanup if needed." };
  }
  return { allowed: true, reason: "" };
}

export function getDeleteActionState(status: ContestStatus, counts: ContestOperationCounts) {
  const operations = hasOperations(counts);

  if (status === "CANCELED") {
    return {
      allowed: true,
      reason: operations
        ? "Allowed: canceled contests can be permanently deleted, including linked operations."
        : "Allowed: no operations found.",
    };
  }

  if (!operations) {
    return { allowed: true, reason: "Allowed: no entries, scores, rankings, or settlements yet." };
  }

  return {
    allowed: false,
    reason: "Delete is blocked because this contest already has operations. Stop/Cancel first, then delete if needed.",
  };
}
