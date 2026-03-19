import type { ContestListItem, ContestStatus } from "@/components/contests/types";
import { getContestStateMessaging, getPrimaryCtaLabel } from "@/components/contests/contestLifecycle";

const CONTEST_CACHE_KEY = "mcg_contests_cache_v1";

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function getContestStatusMeta(status: ContestStatus) {
  const messaging = getContestStateMessaging(status);
  switch (status) {
    case "OPEN":
      return { label: messaging.shortLabel, icon: "🟢", cta: getPrimaryCtaLabel(status), tone: "open" as const };
    case "LOCKED":
      return { label: messaging.shortLabel, icon: "🟣", cta: getPrimaryCtaLabel(status), tone: "locked" as const };
    case "LIVE":
      return { label: messaging.shortLabel, icon: "🟡", cta: getPrimaryCtaLabel(status), tone: "live" as const };
    case "SETTLED":
      return { label: messaging.shortLabel, icon: "🏁", cta: getPrimaryCtaLabel(status), tone: "settled" as const };
    case "CANCELED":
      return { label: messaging.shortLabel, icon: "⛔", cta: getPrimaryCtaLabel(status), tone: "cancelled" as const };
    default:
      return { label: messaging.shortLabel, icon: "📝", cta: getPrimaryCtaLabel(status), tone: "draft" as const };
  }
}

export function getCountdownLabel(status: ContestStatus) {
  if (status === "OPEN") return "Lock in";
  if (status === "LOCKED" || status === "LIVE") return "Ends in";
  return "Timeline";
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

export function saveContestCache(contests: ContestListItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONTEST_CACHE_KEY, JSON.stringify(contests));
}

export function loadContestCache() {
  if (typeof window === "undefined") return [] as ContestListItem[];
  const raw = window.localStorage.getItem(CONTEST_CACHE_KEY);
  if (!raw) return [] as ContestListItem[];
  try {
    return JSON.parse(raw) as ContestListItem[];
  } catch {
    return [] as ContestListItem[];
  }
}
