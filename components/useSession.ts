"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GAME_CONFIG } from "@/lib/game-config";
import type { GuestState } from "@/lib/guest";
import type { GuestSessionPayload, SessionState, UserSessionPayload } from "@/types/session";

const GUEST_STORAGE_KEY = "mcg_guest_state";
const SESSION_CHANGED_EVENT = "mcg:session-changed";

type SessionChangedDetail = { me: SessionState | null };

function emitSessionChanged(me: SessionState | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SessionChangedDetail>(SESSION_CHANGED_EVENT, { detail: { me } }));
}

function createDefaultGuestState(): GuestState {
  return {
    points: GAME_CONFIG.STARTING_POINTS,
    packsOpened: 0,
    mvpCollection: [],
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
    mvpCollection: state.mvpCollection,
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
      emitSessionChanged(payload);
      return true;
    }

    const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const guest = JSON.parse(raw) as GuestState;
      const guestPayload = mapGuestState(guest);
      setMe(guestPayload);
      emitSessionChanged(guestPayload);
      return true;
    }

    setMe(null);
    emitSessionChanged(null);
    return false;
  }, []);

  const startGuest = useCallback(() => {
    const guest = createDefaultGuestState();
    sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
    const guestPayload = mapGuestState(guest);
    setMe(guestPayload);
    emitSessionChanged(guestPayload);
  }, []);

  const clearGuest = useCallback(() => {
    sessionStorage.removeItem(GUEST_STORAGE_KEY);
    setMe(null);
    emitSessionChanged(null);
  }, []);

  const updateGuestState = useCallback((state: GuestState) => {
    sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    const guestPayload = mapGuestState(state);
    setMe(guestPayload);
    emitSessionChanged(guestPayload);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  useEffect(() => {
    const onSessionChanged = (event: Event) => {
      const customEvent = event as CustomEvent<SessionChangedDetail>;
      setMe(customEvent.detail?.me ?? null);
      setLoading(false);
    };

    const refreshOnFocus = () => {
      void refresh();
    };

    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener(SESSION_CHANGED_EVENT, onSessionChanged as EventListener);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, onSessionChanged as EventListener);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [refresh]);

  const isGuest = useMemo(() => me?.mode === "guest", [me]);

  return { me, setMe, loading, refresh, startGuest, clearGuest, updateGuestState, isGuest };
}
