"use client";

import { useEffect, useState } from "react";

type SearchUser = {
  id: string;
  xUsername: string;
  displayName: string;
  points: number;
  createdAt: string;
};

type UserContext = {
  user: { id: string; displayName: string | null; xUsername: string | null; points: number };
  rewards: { grantsCount: number; totalManualGranted: number; lastGrantAt: string | null };
  quests: { pendingSubmissions: number; approvedSubmissions: number; rejectedSubmissions: number; completedProgress: number };
  contests: { entriesCount: number; scoredEntriesCount: number; settlementsCount: number };
};

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SearchUser[]>([]);
  const [selected, setSelected] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!query.trim()) {
        setRows([]);
        return;
      }
      setLoading(true);
      const response = await fetch(`/api/internal/users/search?q=${encodeURIComponent(query.trim())}&limit=12`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { users: SearchUser[] };
        setRows(payload.users ?? []);
      }
      setLoading(false);
    };

    const timer = setTimeout(() => void run(), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const loadContext = async (userId: string) => {
    setContextLoading(true);
    const response = await fetch(`/api/internal/users/${userId}/admin-context`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as UserContext;
      setSelected(payload);
    }
    setContextLoading(false);
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <h1 className="page-title">User Admin Context</h1>
        <p className="page-subtitle">Search users and load minimal operational context before moderation/reward actions.</p>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.6rem" }}>
        <input className="input" placeholder="Search by userId, @username, display name" value={query} onChange={(event) => setQuery(event.target.value)} />
        {loading ? <p className="contest-inline-note">Searching…</p> : null}
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {rows.map((row) => (
            <button key={row.id} type="button" className="contest-ranking-row" style={{ textAlign: "left", gridTemplateColumns: "1fr auto" }} onClick={() => void loadContext(row.id)}>
              <span>{row.displayName} (@{row.xUsername})</span>
              <span>{row.points} pts</span>
            </button>
          ))}
          {query.trim() && !loading && rows.length === 0 ? <p className="contest-inline-note">No users found.</p> : null}
        </div>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.6rem" }}>
        <h2 className="contest-section-title">Selected user context</h2>
        {contextLoading ? <p className="contest-inline-note">Loading context…</p> : null}
        {!contextLoading && selected ? (
          <>
            <p className="contest-inline-note">{selected.user.displayName ?? selected.user.id} (@{selected.user.xUsername ?? "—"}) · {selected.user.points} pts</p>
            <div className="contest-meta-grid">
              <Meta label="Manual grants" value={String(selected.rewards.grantsCount)} />
              <Meta label="Manual points total" value={String(selected.rewards.totalManualGranted)} />
              <Meta label="Quest pending" value={String(selected.quests.pendingSubmissions)} />
              <Meta label="Quest approved" value={String(selected.quests.approvedSubmissions)} />
              <Meta label="Contest entries" value={String(selected.contests.entriesCount)} />
              <Meta label="Contest settled" value={String(selected.contests.settlementsCount)} />
            </div>
          </>
        ) : null}
        {!contextLoading && !selected ? <p className="contest-inline-note">Select a user to load context.</p> : null}
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="contest-meta-label">{label}</p>
      <p className="contest-meta-value">{value}</p>
    </div>
  );
}
