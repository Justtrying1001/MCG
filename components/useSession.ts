"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BaseCard } from "@/types/cards";
import { GAME_CONFIG } from "@/lib/game-config";
import { PVE_DAILY_TICKETS } from "@/lib/pve/constants";
import type { GuestState } from "@/lib/guest";

const GUEST_STORAGE_KEY = "mcg_guest_state";

export type CollectionItem = {
  baseCardId: string;
  quantity: number;
  pveExhausted: boolean;
  card: BaseCard;
};

export type MeResponse = {
  mode: "user";
  user: {
    id: string;
    xUserId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    authProvider: string;
    points: number;
    packsOpened: number;
    pveBattleTickets: number;
    lastPveResetAt: string;
  };
  collection: CollectionItem[];
  openingsCount: number;
  pveRunsCount: number;
  availablePveCards: number;
  exhaustedPveCards: number;
  nextPveResetAt: string;
};

export type GuestSession = {
  mode: "guest";
  user: {
    id: "guest";
    xUserId: null;
    username: "Guest";
    displayName: "Guest";
    avatarUrl: null;
    authProvider: "guest";
    points: number;
    packsOpened: number;
    pveBattleTickets: number;
    lastPveResetAt: string;
  };
  collection: CollectionItem[];
  openingsCount: number;
  pveRunsCount: number;
  availablePveCards: number;
  exhaustedPveCards: number;
  nextPveResetAt: string;
};

export type SessionState = MeResponse | GuestSession;

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

function mapGuestState(state: GuestState): GuestSession {
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
    const res = await fetch("/api/me", { cache: "no-store" });
    if (res.ok) {
      const payload = (await res.json()) as MeResponse;
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
