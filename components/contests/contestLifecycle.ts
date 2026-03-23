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
  if (status === "OPEN") return { editable: true, message: "Open for entry. Build or edit your lineup before team lock." };
  if (status === "LOCKED") return { editable: false, message: "Entry closed. Lineups are locked while the battle is about to start." };
  if (status === "LIVE") return { editable: false, message: "Live now. Battle is in progress and new entries are closed." };
  if (status === "SETTLED") {
    return {
      editable: false,
      message: "Finished. Results are available and rewards have been processed.",
    };
  }
  return { editable: false, message: "Battle lifecycle is not active yet." };
}

export function getPrimaryCtaLabel(status: ContestStatus) {
  if (status === "OPEN") return "Enter battle";
  if (status === "LOCKED") return "View lineup";
  if (status === "LIVE") return "View live standings";
  if (status === "SETTLED") return "View results";
  return "View details";
}

export function getContestStateMessaging(status: ContestStatus) {
  if (status === "OPEN") {
    return {
      shortLabel: "Open for entry",
      longLabel: "Open for entry · Build your lineup before team lock",
      emphasis: "Entries are open right now.",
      helper: "You can still enter and edit your lineup before the battle goes live.",
    };
  }
  if (status === "LOCKED") {
    return {
      shortLabel: "Entry closed",
      longLabel: "Entry closed · Lineups locked",
      emphasis: "Registration is closed.",
      helper: "The battle is about to start, so you can only review submitted lineups.",
    };
  }
  if (status === "LIVE") {
    return {
      shortLabel: "Live now · Entry closed",
      longLabel: "Live now · Entry closed · Battle in progress",
      emphasis: "This battle is already live.",
      helper: "New entries are closed. Follow live standings and scoring until settlement.",
    };
  }
  if (status === "SETTLED") {
    return {
      shortLabel: "Finished · Results available",
      longLabel: "Finished · Results available",
      emphasis: "This battle has finished.",
      helper: "Final rankings and rewards are ready to review.",
    };
  }
  if (status === "CANCELED") {
    return {
      shortLabel: "Canceled",
      longLabel: "Canceled · Battle unavailable",
      emphasis: "This battle was canceled.",
      helper: "Entries and results are no longer active for this battle.",
    };
  }
  return {
    shortLabel: "Draft",
    longLabel: "Draft · Not open yet",
    emphasis: "This battle is not open yet.",
    helper: "Battle configuration is still being prepared.",
  };
}
