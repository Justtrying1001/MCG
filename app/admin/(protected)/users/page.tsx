"use client";

import { useEffect, useState } from "react";

type SearchUser = {
  id: string;
  xUsername: string;
  displayName: string;
  points: number;
};

type UserContext = {
  user: { id: string; displayName: string | null; xUsername: string | null; points: number; createdAt: string };
  rewards: { grantsCount: number; totalManualGranted: number };
  quests: { pendingSubmissions: number; approvedSubmissions: number; rejectedSubmissions: number; completedProgress: number };
  contests: { entriesCount: number; scoredEntriesCount: number; settlementsCount: number };
  milestones: Array<{ questId: string; title: string; code: string; completedAt: string | null }>;
  activity: Array<{ type: string; label: string; at: string; ref: string }>;
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
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">User Context Workbench</h1>
          <p className="admin-subtitle">Search-first user context for moderation, rewards, contests, milestones and forensic activity timeline.</p>
        </div>
      </section>

      <section className="admin-split">
        <div className="admin-panel">
          <p className="admin-section-title">Search</p>
          <input className="input" placeholder="Search by userId, @username, display name" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading ? <p className="contest-inline-note">Searching…</p> : null}
          <div style={{ display: "grid", gap: "0.35rem" }}>
            {rows.map((row) => (
              <button key={row.id} type="button" className="admin-panel" style={{ textAlign: "left", padding: "0.48rem" }} onClick={() => void loadContext(row.id)}>
                <p style={{ fontWeight: 700 }}>{row.displayName} (@{row.xUsername})</p>
                <p className="contest-inline-note">{row.points} pts</p>
              </button>
            ))}
            {query.trim() && !loading && rows.length === 0 ? <p className="contest-inline-note">No users found.</p> : null}
          </div>
        </div>

        <div className="admin-panel">
          <p className="admin-section-title">Selected user context</p>
          {contextLoading ? <p className="contest-inline-note">Loading context…</p> : null}
          {!contextLoading && selected ? (
            <>
              <p style={{ fontWeight: 700 }}>{selected.user.displayName ?? selected.user.id} (@{selected.user.xUsername ?? "—"})</p>
              <p className="contest-inline-note">{selected.user.points} total points · created {new Date(selected.user.createdAt).toLocaleString()}</p>
              <div className="admin-kpi-grid">
                <Kpi label="Manual grants" value={String(selected.rewards.grantsCount)} />
                <Kpi label="Manual points total" value={String(selected.rewards.totalManualGranted)} />
                <Kpi label="Quest pending" value={String(selected.quests.pendingSubmissions)} />
                <Kpi label="Quest approved" value={String(selected.quests.approvedSubmissions)} />
                <Kpi label="Quest rejected" value={String(selected.quests.rejectedSubmissions)} />
                <Kpi label="Quest completed" value={String(selected.quests.completedProgress)} />
                <Kpi label="Contest entries" value={String(selected.contests.entriesCount)} />
                <Kpi label="Contest settled" value={String(selected.contests.settlementsCount)} />
              </div>

              <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.45rem" }}>
                <p className="admin-section-title">Milestones unlocked</p>
                {selected.milestones.map((item) => (
                  <p key={item.questId} className="contest-inline-note">🏅 {item.title} ({item.code}) · {item.completedAt ? new Date(item.completedAt).toLocaleString() : "—"}</p>
                ))}
                {selected.milestones.length === 0 ? <p className="contest-inline-note">No milestones unlocked yet.</p> : null}
              </div>

              <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.45rem" }}>
                <p className="admin-section-title">Activity timeline (who did what)</p>
                {selected.activity.map((item, idx) => (
                  <p key={`${item.ref}-${idx}`} className="contest-inline-note">{new Date(item.at).toLocaleString()} · [{item.type}] {item.label}</p>
                ))}
                {selected.activity.length === 0 ? <p className="contest-inline-note">No recent activity rows.</p> : null}
              </div>
            </>
          ) : null}
          {!contextLoading && !selected ? <p className="contest-inline-note">Select a user from search results to load context.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="admin-kpi"><p className="admin-kpi-label">{label}</p><p className="admin-kpi-value">{value}</p></div>;
}
