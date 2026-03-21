"use client";

import type { CSSProperties } from "react";
import { usePrivyLogin } from "@/components/auth/usePrivyLogin";
import { Button } from "@/components/ui/Button";

type Layout = "stacked" | "inline";

export function ConnectXCallout({
  title,
  description,
  ctaLabel = "Connect wallet / X",
  layout = "stacked",
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  layout?: Layout;
}) {
  const { isStartingLogin, loginWithPrivy, ready } = usePrivyLogin();

  if (layout === "inline") {
    const shellStyle: CSSProperties = {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.85rem",
      padding: "0.95rem 1rem",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
    };

    return (
      <div style={shellStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", marginBottom: "0.2rem" }}>
            {title}
          </strong>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-secondary)",
              fontSize: "0.88rem",
            }}
          >
            {description}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          disabled={!ready || isStartingLogin}
          onClick={() => void loginWithPrivy()}
        >
          {ctaLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="mcg-empty" style={{ gap: "0.9rem" }}>
      <strong>{title}</strong>
      <p>{description}</p>
      <div>
        <Button
          type="button"
          variant="primary"
          disabled={!ready || isStartingLogin}
          onClick={() => void loginWithPrivy()}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
