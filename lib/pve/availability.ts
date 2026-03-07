import { PVE_DAILY_TICKETS, PVE_TEAM_SIZE } from "@/lib/pve/constants";

export function validateTeamIds(selectedCardIds: string[]) {
  if (selectedCardIds.length !== PVE_TEAM_SIZE) {
    return `Team must contain exactly ${PVE_TEAM_SIZE} cards`;
  }
  if (new Set(selectedCardIds).size !== PVE_TEAM_SIZE) {
    return "Team cannot contain duplicate cards";
  }
  return null;
}

export function assertTicketsAvailable(tickets: number) {
  if (tickets <= 0) return "No PvE battle tickets left for today";
  if (tickets > PVE_DAILY_TICKETS) return "Invalid ticket state";
  return null;
}
