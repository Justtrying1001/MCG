"use client";

import { useEffect, useMemo, useState } from "react";

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
  handle: string;
  displayName: string;
  points: number;
  packsOpened: number;
  createdAt: string;
  level: number | null;
  xp: number | null;
};

type UserContext = {
  user: { id: string; displayName: string | null; handle: string | null; points: number; createdAt: string };
  rewards: { grantsCount: number; totalManualGranted: number };
  quests: { pendingSubmissions: number; approvedSubmissions: number; rejectedSubmissions: number; completedProgress: number };
  contests: { entriesCount: number; scoredEntriesCount: number; settlementsCount: number };
  milestones: Array<{ questId: string; title: string; code: string; completedAt: string | null }>;
  activity: Array<{ type: string; label: string; at: string; ref: string }>;
};

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SearchUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const params = new URLSearchParams({ limit: "60" });
      if (query.trim()) {
        params.set("q", query.trim());
      }
      const response = await fetch(`/api/internal/admin/users?${params.toString()}`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { users: SearchUser[]; total: number };
        setRows(payload.users ?? []);
        setTotalUsers(payload.total ?? 0);
      }
      setLoading(false);
    };

    const timer = setTimeout(() => void run(), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const loadContext = async (userId: string) => {
    setSelectedUserId(userId);
    setContextLoading(true);
    const response = await fetch(`/api/internal/users/${userId}/admin-context`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as UserContext;
      setSelected(payload);
    }
    setContextLoading(false);
  };

  useEffect(() => {
    if (!rows.length) {
      setSelectedUserId(null);
      setSelected(null);
      return;
    }

    if (selectedUserId && rows.some((row) => row.id === selectedUserId)) {
      return;
    }

    void loadContext(rows[0].id);
  }, [rows, selectedUserId]);

  const usersLabel = useMemo(() => `Users (${totalUsers})`, [totalUsers]);

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Users"
        subtitle="Browse users and inspect rewards, quests, contest participation and account activity."
      />

      <div className="admin-v2-split">
        <AdminPanel className="admin-users-browser-panel">
          <p className="admin-v2-section-title">{usersLabel}</p>
          <input className="input" placeholder="Search by userId, @username, display name" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading ? <p className="contest-inline-note">Loading users…</p> : null}
          <div className="admin-v2-list-stack admin-users-browser-list" role="listbox" aria-label="Users list">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`admin-v2-list-row action ${selectedUserId === row.id ? "is-active" : ""}`}
                onClick={() => void loadContext(row.id)}
              >
                <span>
                  <strong>{row.displayName} {row.handle ? `(@${row.handle})` : ""}</strong>
                  <small className="contest-inline-note">{row.points} pts · {row.packsOpened} packs · lvl {row.level ?? "—"}</small>
                </span>
                <small className="contest-inline-note">{new Date(row.createdAt).toLocaleDateString()}</small>
              </button>
            ))}
            {!loading && rows.length === 0 ? <AdminEmptyState title="No users found for this filter." /> : null}
          </div>
        </AdminPanel>

        <AdminPanel className="admin-users-context-panel">
          <p className="admin-v2-section-title">Selected user context</p>
          {contextLoading ? <AdminEmptyState title="Loading context…" /> : null}
          {!contextLoading && selected ? (
            <>
              <p><strong>{selected.user.displayName ?? selected.user.id}</strong> (@{selected.user.handle ?? "—"})</p>
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
          {!contextLoading && !selected ? <AdminEmptyState title="No user selected." description="Pick a user from the left list to load context." /> : null}
        </AdminPanel>
      </div>
    </div>
  );
}
