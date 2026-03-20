"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSession } from "@/components/useSession";
import { getAnalyticsRequestHeaders } from "@/lib/analytics/visitor-id";

const LOGIN_REQUESTED_STORAGE_KEY = "mcg_privy_login_requested";
const PRIVY_LOGOUT_WAIT_TIMEOUT_MS = 1500;
const PRIVY_LOGOUT_WAIT_INTERVAL_MS = 50;

function hasPendingLoginRequest() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(LOGIN_REQUESTED_STORAGE_KEY) === "1";
}

function writePendingLoginRequest(value: boolean) {
  if (typeof window === "undefined") return;
  if (value) {
    window.sessionStorage.setItem(LOGIN_REQUESTED_STORAGE_KEY, "1");
    return;
  }
  window.sessionStorage.removeItem(LOGIN_REQUESTED_STORAGE_KEY);
}

export function usePrivyLogin() {
  const { authenticated, getAccessToken, login, logout, ready, user } = usePrivy();
  const { me, refresh, setMe } = useSession();
  const [isSyncingSession, setIsSyncingSession] = useState(false);
  const privyStateRef = useRef({ authenticated, ready, user });

  useEffect(() => {
    privyStateRef.current = { authenticated, ready, user };
  }, [authenticated, ready, user]);

  const waitForPrivyLogout = useCallback(async () => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < PRIVY_LOGOUT_WAIT_TIMEOUT_MS) {
      const { authenticated: isAuthenticated, ready: isReady, user: currentUser } = privyStateRef.current;
      if (isReady && !isAuthenticated && !currentUser) {
        return true;
      }

      await new Promise((resolve) => window.setTimeout(resolve, PRIVY_LOGOUT_WAIT_INTERVAL_MS));
    }

    return false;
  }, []);

  const syncSession = useCallback(async () => {
    if (!ready || !authenticated) return false;

    setIsSyncingSession(true);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return false;
      }

      const response = await fetch("/api/auth/privy/exchange", {
        method: "POST",
        headers: getAnalyticsRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        return false;
      }

      writePendingLoginRequest(false);
      await refresh();
      return true;
    } catch {
      return false;
    } finally {
      setIsSyncingSession(false);
    }
  }, [authenticated, getAccessToken, ready, refresh]);

  const loginWithPrivy = useCallback(async () => {
    if (privyStateRef.current.authenticated || privyStateRef.current.user) {
      await logout();
      await waitForPrivyLogout();
    }

    writePendingLoginRequest(true);
    login({ loginMethods: ["twitter"] });
  }, [login, logout, waitForPrivyLogout]);

  const logoutFromApp = useCallback(async () => {
    writePendingLoginRequest(false);
    await Promise.allSettled([
      fetch("/api/auth/logout", { method: "POST" }),
      logout(),
    ]);
    setMe(null);
    await refresh();
  }, [logout, refresh, setMe]);

  useEffect(() => {
    if (!ready || !authenticated || me || isSyncingSession || !hasPendingLoginRequest()) return;
    void syncSession();
  }, [authenticated, isSyncingSession, me, ready, syncSession]);

  return useMemo(() => ({
    authenticated,
    isSyncingSession,
    loginWithPrivy,
    logoutFromApp,
    ready,
  }), [authenticated, isSyncingSession, loginWithPrivy, logoutFromApp, ready]);
}
