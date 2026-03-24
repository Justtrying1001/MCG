"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";

function normalizeHandleInput(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}

export function HandleOnboardingForm() {
  const router = useRouter();
  const { me, refresh } = useSession();
  const [handle, setHandle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => normalizeHandleInput(handle), [handle]);

  async function submit() {
    if (!preview || isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/me/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: preview }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error || 'Unable to save handle');
        return;
      }
      await refresh();
      router.replace('/profile');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mcg-surface handle-onboarding-card">
      <p className="mcg-eyebrow">Profile onboarding</p>
      <h1>Choose your handle</h1>
      <p className="handle-onboarding-copy">
        Wallet-first collectors need to pick a unique handle before entering the app.
      </p>

      <label className="handle-onboarding-field">
        <span>Handle</span>
        <input
          value={handle}
          onChange={(event) => setHandle(normalizeHandleInput(event.target.value))}
          placeholder="your_handle"
          maxLength={20}
          autoFocus
        />
      </label>

      <p className="handle-onboarding-preview">
        Preview: <strong>{preview ? `@${preview}` : '@your_handle'}</strong>
      </p>

      {error ? <p className="handle-onboarding-error">{error}</p> : null}

      <div className="handle-onboarding-actions">
        <Button className="btn-sm" disabled={!preview || isSaving} onClick={() => void submit()}>
          {isSaving ? 'Saving…' : 'Save handle'}
        </Button>
      </div>

      {me?.linkedWallets.solanaWallets[0] ? (
        <p className="handle-onboarding-note">Connected wallet: {me.linkedWallets.solanaWallets[0].address}</p>
      ) : null}
    </section>
  );
}
