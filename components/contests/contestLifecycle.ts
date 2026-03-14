import type { ContestStatus } from "@/components/contests/types";

export type ContestPhase = "OPEN" | "TEAM_LOCK" | "LIVE" | "END" | "RESULT";

export function toUserPhase(status: ContestStatus): ContestPhase {
  if (status === "OPEN") return "OPEN";
  if (status === "LOCKED") return "TEAM_LOCK";
  if (status === "LIVE") return "LIVE";
  if (status === "SETTLED") return "RESULT";
  return "END";
}

export function getPhaseLabel(status: ContestStatus) {
  const phase = toUserPhase(status);
  if (phase === "OPEN") return "Open";
  if (phase === "TEAM_LOCK") return "Team Lock / Start";
  if (phase === "LIVE") return "Live";
  if (phase === "RESULT") return "Result";
  return "End / Computing";
}

export function getActionability(status: ContestStatus) {
  if (status === "OPEN") return { editable: true, message: "Entry is open: build or edit your lineup before lock." };
  if (status === "LOCKED") return { editable: false, message: "Lineups are locked. You can only review your submitted team." };
  if (status === "LIVE") return { editable: false, message: "Contest is live. Follow ranking updates until settlement." };
  if (status === "SETTLED") {
    return {
      editable: false,
      message: "Settled: view final ranking, rewards status, and reuse your cards in new contests.",
    };
  }
  return { editable: false, message: "Contest lifecycle is not active yet." };
}

export function getPrimaryCtaLabel(status: ContestStatus) {
  if (status === "OPEN") return "Enter contest";
  if (status === "LOCKED") return "View team";
  if (status === "LIVE") return "Track contest";
  if (status === "SETTLED") return "View results";
  return "View details";
}
