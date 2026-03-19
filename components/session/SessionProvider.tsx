"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SessionState, UserSessionPayload } from "@/types/session";

const SESSION_CHANGED_EVENT = "mcg:session-changed";
const REFRESH_DEDUP_MS = 1_500;

type SessionChangedDetail = { me: SessionState | null };

type SessionContextValue = {
  me: SessionState | null;
  loading: boolean;
  setMe: (value: SessionState | null) => void;
  refresh: () => Promise<boolean>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function emitSessionChanged(me: SessionState | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SessionChangedDetail>(SESSION_CHANGED_EVENT, { detail: { me } }));
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMeState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const meRef = useRef<SessionState | null>(null);
  const inFlightRefreshRef = useRef<Promise<boolean> | null>(null);
  const lastRefreshAtRef = useRef(0);

  const setMe = useCallback((value: SessionState | null) => {
    meRef.current = value;
    setMeState(value);
    emitSessionChanged(value);
  }, []);

  const refresh = useCallback(async () => {
    const now = Date.now();
    if (inFlightRefreshRef.current && now - lastRefreshAtRef.current < REFRESH_DEDUP_MS) {
      return inFlightRefreshRef.current;
    }

    lastRefreshAtRef.current = now;
    const request = (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.ok) {
          const payload = (await res.json()) as UserSessionPayload;
          meRef.current = payload;
          setMeState(payload);
          emitSessionChanged(payload);
          return true;
        }

        if (res.status === 401) {
          meRef.current = null;
          setMeState(null);
          emitSessionChanged(null);
          return false;
        }

        return Boolean(meRef.current);
      } catch {
        return Boolean(meRef.current);
      } finally {
        inFlightRefreshRef.current = null;
      }
    })();

    inFlightRefreshRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const hasSession = await refresh();
      if (!active) return;
      if (!hasSession && !meRef.current) {
        setMeState(null);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    const onSessionChanged = (event: Event) => {
      const customEvent = event as CustomEvent<SessionChangedDetail>;
      meRef.current = customEvent.detail?.me ?? null;
      setMeState(customEvent.detail?.me ?? null);
      setLoading(false);
    };

    const refreshIfNeeded = () => {
      void refresh();
    };

    const refreshOnFocus = () => {
      refreshIfNeeded();
    };

    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshIfNeeded();
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

  const value = useMemo<SessionContextValue>(() => ({
    me,
    loading,
    setMe,
    refresh,
  }), [loading, me, refresh, setMe]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}
