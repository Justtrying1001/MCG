"use client";

import { usePrivyLogin } from "@/components/auth/usePrivyLogin";
import { Button } from "@/components/ui/Button";

export function ConnectXCallout({
  title,
  description,
  ctaLabel = "Connect X",
}: {
  title: string;
  description: string;
  ctaLabel?: string;
}) {
  const { isStartingLogin, loginWithPrivy, ready } = usePrivyLogin();

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
