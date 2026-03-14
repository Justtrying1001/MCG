"use client";

import { useEffect, useState } from "react";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatStrip,
  AdminTableRow,
  AdminDataTable,
  AdminTableHead,
  AdminStatusBadge,
} from "@/components/admin/AdminUi";

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
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Users"
        subtitle="Search-first diagnostics for rewards, quests, contest participation and account activity."
      />

      <div className="admin-v2-split">
        <AdminPanel>
          <p className="admin-v2-section-title">Search users</p>
          <input className="input" placeholder="Search by userId, @username, display name" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading ? <p className="contest-inline-note">Searching…</p> : null}
          <div className="admin-v2-list-stack">
            {rows.map((row) => (
              <button key={row.id} type="button" className="admin-v2-list-row action" onClick={() => void loadContext(row.id)}>
                <span>
                  <strong>{row.displayName} (@{row.xUsername})</strong>
                  <small className="contest-inline-note">{row.points} pts</small>
                </span>
              </button>
            ))}
            {query.trim() && !loading && rows.length === 0 ? <AdminEmptyState title="No users found." /> : null}
          </div>
        </AdminPanel>

        <AdminPanel>
          <p className="admin-v2-section-title">Selected user context</p>
          {contextLoading ? <AdminEmptyState title="Loading context…" /> : null}
          {!contextLoading && selected ? (
            <>
              <p><strong>{selected.user.displayName ?? selected.user.id}</strong> (@{selected.user.xUsername ?? "—"})</p>
              <p className="contest-inline-note">{selected.user.points} total points · created {new Date(selected.user.createdAt).toLocaleString()}</p>

              <AdminStatStrip items={[
                { label: "Manual grants", value: String(selected.rewards.grantsCount) },
                { label: "Granted points", value: String(selected.rewards.totalManualGranted) },
                { label: "Quest pending", value: String(selected.quests.pendingSubmissions), tone: selected.quests.pendingSubmissions > 0 ? "warn" : "neutral" },
                { label: "Quest completed", value: String(selected.quests.completedProgress), tone: "success" },
                { label: "Contest entries", value: String(selected.contests.entriesCount) },
                { label: "Contest settled", value: String(selected.contests.settlementsCount) },
              ]} />

              <p className="admin-v2-section-title">Milestones unlocked</p>
              <div className="admin-v2-list-stack">
                {selected.milestones.map((item) => (
                  <div key={item.questId} className="admin-v2-list-row">
                    <span>🏅 {item.title} ({item.code})</span>
                    <span className="contest-inline-note">{item.completedAt ? new Date(item.completedAt).toLocaleString() : "—"}</span>
                  </div>
                ))}
                {selected.milestones.length === 0 ? <AdminEmptyState title="No milestones unlocked yet." /> : null}
              </div>

              <p className="admin-v2-section-title">Recent activity</p>
              <AdminDataTable columns="1fr 2fr 1fr">
                <AdminTableHead><span>Time</span><span>Event</span><span>Type</span></AdminTableHead>
                {selected.activity.map((item, idx) => (
                  <AdminTableRow key={`${item.ref}-${idx}`}>
                    <span className="contest-inline-note">{new Date(item.at).toLocaleString()}</span>
                    <span>{item.label}</span>
                    <AdminStatusBadge tone="neutral" label={item.type} />
                  </AdminTableRow>
                ))}
                {selected.activity.length === 0 ? <AdminTableRow><span>No recent activity rows.</span></AdminTableRow> : null}
              </AdminDataTable>
            </>
          ) : null}
          {!contextLoading && !selected ? <AdminEmptyState title="Select a user from search results to load context." /> : null}
        </AdminPanel>
      </div>
    </div>
  );
}
