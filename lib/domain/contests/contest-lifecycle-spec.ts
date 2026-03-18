import { ContestStatus } from "@prisma/client";

export type ContestLifecycleMode = "manual" | "auto";

export const CONTEST_ALLOWED_TRANSITIONS: Record<ContestStatus, ContestStatus[]> = {
  [ContestStatus.DRAFT]: [ContestStatus.OPEN, ContestStatus.CANCELED],
  [ContestStatus.OPEN]: [ContestStatus.LIVE, ContestStatus.CANCELED],
  [ContestStatus.LOCKED]: [ContestStatus.LIVE, ContestStatus.CANCELED],
  [ContestStatus.LIVE]: [ContestStatus.SETTLED, ContestStatus.CANCELED],
  [ContestStatus.SETTLED]: [],
  [ContestStatus.CANCELED]: [],
};

export function getAllowedContestTransitions(current: ContestStatus): ContestStatus[] {
  return CONTEST_ALLOWED_TRANSITIONS[current] ?? [];
}
