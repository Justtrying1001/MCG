import type { ContestStatus } from "@/components/contests/types";

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function getContestStatusMeta(status: ContestStatus) {
  switch (status) {
    case "OPEN":
      return { label: "Open", icon: "🟢", cta: "Join", tone: "open" as const };
    case "LOCKED":
      return { label: "Locked", icon: "🟣", cta: "View lineup", tone: "locked" as const };
    case "LIVE":
      return { label: "Live", icon: "🟡", cta: "Track", tone: "live" as const };
    case "SETTLED":
      return { label: "Settled", icon: "🏁", cta: "View results", tone: "settled" as const };
    case "CANCELED":
      return { label: "Cancelled", icon: "⛔", cta: "Details", tone: "cancelled" as const };
    default:
      return { label: "Draft", icon: "📝", cta: "Prepare", tone: "draft" as const };
  }
}

export function getCountdownLabel(status: ContestStatus) {
  if (status === "OPEN") return "Lock in";
  if (status === "LOCKED" || status === "LIVE") return "Ends in";
  return "Window";
}

export function getTargetDate(status: ContestStatus, lockAt: string | null, endsAt: string | null) {
  if (status === "OPEN") return lockAt;
  if (status === "LOCKED" || status === "LIVE") return endsAt;
  return null;
}

export function formatCountdown(targetDate: string | null, nowTs: number) {
  if (!targetDate) return "—";
  const diff = new Date(targetDate).getTime() - nowTs;
  if (diff <= 0) return "00:00:00";
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
