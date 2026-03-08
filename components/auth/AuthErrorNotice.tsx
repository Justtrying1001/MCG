"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  x_oauth_env: "Login is temporarily unavailable due to OAuth configuration. Please try again later.",
  x_oauth_state: "Your login session expired or was invalid. Please retry the X login flow.",
  x_oauth_failed: "We could not complete login with X. Please try again.",
  x_oauth_denied: "You cancelled or denied the X authorization request.",
};

export function AuthErrorNotice() {
  const searchParams = useSearchParams();
  const code = searchParams.get("auth_error") ?? "";

  const message = useMemo(() => MESSAGES[code], [code]);

  if (!message) return null;

  return (
    <div
      role="alert"
      style={{
        marginBottom: "1rem",
        padding: "0.8rem 1rem",
        borderRadius: "10px",
        border: "1px solid rgba(255,80,80,0.45)",
        background: "rgba(70,0,0,0.35)",
        color: "#ffd6d6",
      }}
    >
      {message}
    </div>
  );
}
