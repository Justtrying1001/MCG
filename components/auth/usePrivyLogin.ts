"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSession } from "@/components/useSession";

const PENDING_INVITE_STORAGE_KEY = "mcg_privy_pending_invite";

function readPendingInviteCode() {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(PENDING_INVITE_STORAGE_KEY)?.trim() ?? "";
  return value || null;
}

function writePendingInviteCode(inviteCode?: string | null) {
  if (typeof window === "undefined") return;
  const normalized = String(inviteCode ?? "").trim();
  if (normalized) {
    window.sessionStorage.setItem(PENDING_INVITE_STORAGE_KEY, normalized);
    return;
  }
  window.sessionStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
}

function getInviteCodeFromLocation() {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  return url.searchParams.get("invite") ?? url.searchParams.get("ref");
}

export function usePrivyLogin() {
  const { authenticated, getAccessToken, login, logout, ready } = usePrivy();
  const { me, refresh, setMe } = useSession();
  const [isSyncingSession, setIsSyncingSession] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncSession = useCallback(async (inviteCode?: string | null) => {
    if (!ready || !authenticated) return false;

    setIsSyncingSession(true);
    setSyncError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setSyncError("Privy access token unavailable.");
        return false;
      }

      const response = await fetch("/api/auth/privy/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          inviteCode: inviteCode ?? readPendingInviteCode(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        setSyncError(payload?.error ?? "Privy exchange failed.");
        return false;
      }

      writePendingInviteCode(null);
      await refresh();
      return true;
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Privy exchange failed.");
      return false;
    } finally {
      setIsSyncingSession(false);
    }
  }, [authenticated, getAccessToken, ready, refresh]);

  const loginWithPrivy = useCallback((inviteCode?: string | null) => {
    const resolvedInviteCode = inviteCode ?? getInviteCodeFromLocation();
    writePendingInviteCode(resolvedInviteCode);

    if (authenticated) {
      void syncSession(resolvedInviteCode);
      return;
    }

    login({ loginMethods: ["twitter"] });
  }, [authenticated, login, syncSession]);

  const logoutFromPrivy = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    await logout();
    await refresh();
  }, [logout, refresh, setMe]);

  useEffect(() => {
    if (!ready || !authenticated || me || isSyncingSession) return;
    void syncSession(readPendingInviteCode());
  }, [authenticated, isSyncingSession, me, ready, syncSession]);

  return useMemo(() => ({
    authenticated,
    isSyncingSession,
    loginWithPrivy,
    logoutFromPrivy,
    ready,
    syncError,
  }), [authenticated, isSyncingSession, loginWithPrivy, logoutFromPrivy, ready, syncError]);
}
