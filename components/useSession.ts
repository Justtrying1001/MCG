"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GAME_CONFIG } from "@/lib/game-config";
import { PVE_DAILY_TICKETS } from "@/lib/pve/constants";
import type { GuestState } from "@/lib/guest";
import type { GuestSessionPayload, SessionState, UserSessionPayload } from "@/types/session";

const GUEST_STORAGE_KEY = "mcg_guest_state";

function getNextReset(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)).toISOString();
}

function createDefaultGuestState(now = new Date()): GuestState {
  return {
    points: GAME_CONFIG.STARTING_POINTS,
    packsOpened: 0,
    pveBattleTickets: PVE_DAILY_TICKETS,
    lastPveResetAt: now.toISOString(),
    nextPveResetAt: getNextReset(now),
    collection: [],
    openingsCount: 0,
    pveRunsCount: 0,
  };
}

function mapGuestState(state: GuestState): GuestSessionPayload {
  return {
    mode: "guest",
    user: {
      id: "guest",
      xUserId: null,
      username: "Guest",
      displayName: "Guest",
      avatarUrl: null,
      authProvider: "guest",
      points: state.points,
      packsOpened: state.packsOpened,
      pveBattleTickets: state.pveBattleTickets,
      lastPveResetAt: state.lastPveResetAt,
    },
    collection: state.collection,
    openingsCount: state.openingsCount,
    pveRunsCount: state.pveRunsCount,
    availablePveCards: state.collection.filter((c) => !c.pveExhausted).length,
    exhaustedPveCards: state.collection.filter((c) => c.pveExhausted).length,
    nextPveResetAt: state.nextPveResetAt,
  };
}

export function useSession() {
  const [me, setMe] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Phase 0 boundary: this hook bootstraps auth/session transport only.
    // Domain-heavy reads should progressively move to dedicated hooks as migration proceeds.
    const res = await fetch("/api/me", { cache: "no-store" });
    if (res.ok) {
      const payload = (await res.json()) as UserSessionPayload;
      sessionStorage.removeItem(GUEST_STORAGE_KEY);
      setMe(payload);
      return true;
    }

    const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const guest = JSON.parse(raw) as GuestState;
      setMe(mapGuestState(guest));
      return true;
    }

    setMe(null);
    return false;
  }, []);

  const startGuest = useCallback(() => {
    const guest = createDefaultGuestState();
    sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
    setMe(mapGuestState(guest));
  }, []);

  const clearGuest = useCallback(() => {
    sessionStorage.removeItem(GUEST_STORAGE_KEY);
    setMe(null);
  }, []);

  const updateGuestState = useCallback((state: GuestState) => {
    sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    setMe(mapGuestState(state));
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const isGuest = useMemo(() => me?.mode === "guest", [me]);

  return { me, setMe, loading, refresh, startGuest, clearGuest, updateGuestState, isGuest };
}
