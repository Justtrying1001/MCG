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
  if (status === "OPEN") return { editable: true, message: "Your lineup is editable until team lock." };
  if (status === "LOCKED") return { editable: false, message: "Team lock is active. Lineups are frozen." };
  if (status === "LIVE") return { editable: false, message: "Contest is live. Track scores in real-time." };
  if (status === "SETTLED") return { editable: false, message: "Results are available." };
  return { editable: false, message: "Contest lifecycle is not active yet." };
}
