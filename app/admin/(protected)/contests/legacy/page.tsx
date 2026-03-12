"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";

type ContestRule = {
  id: string;
  cardSetId: string | null;
  maxRosterSize: number | null;
};

type AdminContest = {
  id: string;
  code: string;
  title: string;
  status: "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  rules: ContestRule[];
  _count: {
    entries: number;
    rankings: number;
    settlements: number;
  };
};

const STATUS_OPTIONS: AdminContest["status"][] = ["DRAFT", "OPEN", "LOCKED", "LIVE", "SETTLED", "CANCELED"];

export default function AdminContestsPage() {
  const [contests, setContests] = useState<AdminContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<AdminContest["status"]>("DRAFT");
  const [startsAt, setStartsAt] = useState("");
  const [lockAt, setLockAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxRosterSize, setMaxRosterSize] = useState("5");
  const [cardSetId, setCardSetId] = useState("");
  const [configText, setConfigText] = useState("");

  const loadContests = async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/internal/contests", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot load contests");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { contests: AdminContest[] };
    setContests(payload.contests ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadContests();
  }, []);

  const submitCreateContest = async () => {
    setCreateError("");
    setCreateSuccess("");

    if (!code.trim() || !title.trim()) {
      setCreateError("Code and title are required");
      return;
    }

    let parsedConfig: unknown = undefined;
    if (configText.trim()) {
      try {
        parsedConfig = JSON.parse(configText);
      } catch {
        setCreateError("Config JSON is invalid");
        return;
      }
    }

    const parsedMaxRosterSize = Number(maxRosterSize);
    if (!Number.isInteger(parsedMaxRosterSize) || parsedMaxRosterSize <= 0) {
      setCreateError("maxRosterSize must be a positive integer");
      return;
    }

    setCreating(true);

    const response = await fetch("/api/internal/contests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        title: title.trim(),
        status,
        startsAt: startsAt || null,
        lockAt: lockAt || null,
        endsAt: endsAt || null,
        maxRosterSize: parsedMaxRosterSize,
        cardSetId: cardSetId.trim() || null,
        config: parsedConfig,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setCreateError(payload?.error ?? "Contest creation failed");
      setCreating(false);
      return;
    }

    setCreateSuccess("Contest created successfully.");
    setCreating(false);
    await loadContests();
  };

  return (
    <SiteShell>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Contest Admin</h1>
          <p className="page-subtitle">Internal ops panel for contest lifecycle management.</p>
        </div>
        <AdminLogoutButton />
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        <section className="contest-section" style={{ display: "grid", gap: "0.8rem" }}>
          <h2 className="contest-section-title">Create contest</h2>
          <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input className="input" placeholder="Code" value={code} onChange={(event) => setCode(event.target.value)} />
            <input className="input" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value as AdminContest["status"])}>
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <input className="input" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            <input className="input" type="datetime-local" value={lockAt} onChange={(event) => setLockAt(event.target.value)} />
            <input className="input" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
            <input className="input" type="number" min={1} value={maxRosterSize} onChange={(event) => setMaxRosterSize(event.target.value)} />
            <input className="input" placeholder="cardSetId (optional)" value={cardSetId} onChange={(event) => setCardSetId(event.target.value)} />
          </div>
          <textarea
            className="input"
            rows={5}
            placeholder='Config JSON (optional), e.g. {"mode":"standard"}'
            value={configText}
            onChange={(event) => setConfigText(event.target.value)}
          />
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            <Button onClick={() => void submitCreateContest()} disabled={creating}>{creating ? "Creating…" : "Create contest"}</Button>
            {createSuccess ? <span className="contest-inline-note">{createSuccess}</span> : null}
            {createError ? <span className="contest-error">{createError}</span> : null}
          </div>
        </section>

        <section className="contest-section">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
            <h2 className="contest-section-title">Contests</h2>
            <Button variant="ghost" onClick={() => void loadContests()}>Refresh</Button>
          </div>

          {loading ? <p className="contest-inline-note">Loading contests…</p> : null}
          {error ? <p className="contest-error">{error}</p> : null}

          {!loading && !error ? (
            <div className="contest-list">
              {contests.map((contest) => (
                <Link href={`/admin/contests/legacy/${contest.id}`} className="contest-card" key={contest.id}>
                  <div className="contest-card-top">
                    <p className="contest-code">{contest.code}</p>
                    <span className={`contest-status status-${contest.status.toLowerCase()}`}>{contest.status}</span>
                  </div>
                  <h3 className="contest-title">{contest.title}</h3>
                  <div className="contest-meta-grid">
                    <ContestMeta label="Entries" value={String(contest._count.entries)} />
                    <ContestMeta label="Rankings" value={String(contest._count.rankings)} />
                    <ContestMeta label="Settled" value={contest._count.settlements > 0 ? "Yes" : "No"} />
                    <ContestMeta label="Starts" value={formatDate(contest.startsAt)} />
                    <ContestMeta label="Lock" value={formatDate(contest.lockAt)} />
                    <ContestMeta label="Ends" value={formatDate(contest.endsAt)} />
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </SiteShell>
  );
}

function ContestMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="contest-meta-label">{label}</p>
      <p className="contest-meta-value">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
