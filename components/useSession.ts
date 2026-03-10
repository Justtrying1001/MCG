"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GAME_CONFIG } from "@/lib/game-config";
import type { GuestState } from "@/lib/guest";
import type { GuestSessionPayload, SessionState, UserSessionPayload } from "@/types/session";

const GUEST_STORAGE_KEY = "mcg_guest_state";

function createDefaultGuestState(): GuestState {
  return {
    points: GAME_CONFIG.STARTING_POINTS,
    packsOpened: 0,
    collection: [],
    openingsCount: 0,
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
    },
    collection: state.collection,
    openingsCount: state.openingsCount,
  };
}

export function useSession() {
  const [me, setMe] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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
