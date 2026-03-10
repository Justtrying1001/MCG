"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot log in");
      setSubmitting(false);
      return;
    }

    router.replace("/admin/contests");
    router.refresh();
  };

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Login</h1>
          <p className="page-subtitle">Authenticate to access internal contest operations.</p>
        </div>
      </div>

      <section className="contest-section" style={{ display: "grid", gap: "0.8rem", maxWidth: 520 }}>
        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            if (error) setError("");
          }}
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (error) setError("");
          }}
        />

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Logging in…" : "Log in"}</Button>
          {error ? <span className="contest-error">{error}</span> : null}
        </div>
      </section>
    </SiteShell>
  );
}
