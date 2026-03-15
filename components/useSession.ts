"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionState, UserSessionPayload } from "@/types/session";

const SESSION_CHANGED_EVENT = "mcg:session-changed";

type SessionChangedDetail = { me: SessionState | null };

function emitSessionChanged(me: SessionState | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SessionChangedDetail>(SESSION_CHANGED_EVENT, { detail: { me } }));
}

export function useSession() {
  const [me, setMe] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/me", { cache: "no-store" });
    if (res.ok) {
      const payload = (await res.json()) as UserSessionPayload;
      setMe(payload);
      emitSessionChanged(payload);
      return true;
    }

    setMe(null);
    emitSessionChanged(null);
    return false;
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

  return { me, setMe, loading, refresh };
}
