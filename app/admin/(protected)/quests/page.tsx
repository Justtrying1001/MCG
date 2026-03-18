"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { parseSocialTargetUrl } from "@/lib/domain/quests/social";

type LifecycleStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

type QuestRow = {
  id: string;
  code: string;
  title: string;
  type: string;
  validationMode: string;
  rewardPoints: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
  lifecycleStatus?: LifecycleStatus;
  rewardPackDefinitionCode?: string | null;
  rewardPackQuantity?: number | null;
  config?: Record<string, unknown> | null;
  analytics?: { completedCount?: number; progressCount?: number; totalPointsDistributed?: number };
};

type QuestCardTargetSummary = {
  networkLabel: string;
  kindLabel: string;
  icon: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  tweetId: string | null;
  handle: string | null;
  url: string | null;
  urlLabel: string | null;
  contextLabel: string | null;
};

const QUEST_TYPE_LABELS: Record<string, string> = {
  SOCIAL_FOLLOW_X: "Follow account",
  SOCIAL_ENGAGEMENT_X: "X engagement",
  CONTEST_COUNT_MILESTONE: "Milestone",
  MANUAL: "Manual quest",
  WELCOME: "Welcome quest",
};

const SOCIAL_ACTION_LABELS: Record<string, string> = {
  LIKE: "Like post",
  RETWEET: "RT post",
  COMMENT: "Comment post",
  CUSTOM: "Custom action",
};

const LIFECYCLE_TONE: Record<LifecycleStatus, string> = {
  ACTIVE: "success",
  ARCHIVED: "neutral",
  DELETED: "danger",
};

export default function QuestLibraryPage() {
  const [rows, setRows] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<QuestRow | null>(null);

  const load = async () => {
    const response = await fetch("/api/internal/quests/library", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { quests: QuestRow[] };
      setRows((payload.quests ?? []).filter((q) => q.type !== "CONTEST_COUNT_MILESTONE"));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!showDeleted && (row.lifecycleStatus ?? "ACTIVE") === "DELETED") return false;
      if (!q) return true;

      const target = buildQuestCardTargetSummary(row);
      const haystack = [
        row.code,
        row.title,
        resolveQuestTypeLabel(row),
        target.primaryLabel,
        target.secondaryLabel,
        target.tweetId,
        target.handle,
        target.url,
        target.contextLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rows, query, showDeleted]);

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const lifecycle = row.lifecycleStatus ?? "ACTIVE";
        acc.all += 1;
        if (lifecycle === "ACTIVE") acc.active += 1;
        if (lifecycle === "ARCHIVED") acc.archived += 1;
        if (lifecycle === "DELETED") acc.deleted += 1;
        return acc;
      },
      { all: 0, active: 0, archived: 0, deleted: 0 },
    );
  }, [rows]);

  const applyLifecycle = async (questId: string, action: "DISABLE" | "ENABLE" | "ARCHIVE" | "DELETE_SOFT") => {
    if (action === "DELETE_SOFT") {
      const confirmed = window.confirm("Delete this quest? It will be soft deleted.");
      if (!confirmed) return;
    }
    setBusyId(questId);
    const response = await fetch(`/api/internal/quests/${questId}/lifecycle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) setMessage(payload?.error ?? "Lifecycle update failed");
    else setMessage("Quest updated.");
    setBusyId(null);
    await load();
  };

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Quests</h1>
          <p className="admin-subtitle">Social quest cards now surface their X target, tweet/account identifiers, and quick context directly in the grid.</p>
          {message ? <p className="contest-inline-note">{message}</p> : null}
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
            <span className="admin-badge neutral">Total {stats.all}</span>
            <span className="admin-badge neutral">Active {stats.active}</span>
            <span className="admin-badge neutral">Archived {stats.archived}</span>
            <span className="admin-badge neutral">Deleted {stats.deleted}</span>
          </div>
        </div>
        <div className="admin-actions-row">
          <Link href="/admin/quests/builder?objectiveType=FOLLOW_X" className="btn" style={{ background: "var(--red)", color: "#fff" }}>Create Quest</Link>
          <Link href="/admin/milestones" className="btn btn-ghost">Milestones</Link>
        </div>
      </section>

      <section className="admin-toolbar">
        <input className="input" placeholder="Search quests, tweet ID, handle, URL…" value={query} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: 320 }} />
        <label className="contest-inline-note" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} /> show deleted
        </label>
        <span className="admin-badge neutral">{filtered.length} quests</span>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading quests…</p></section> : null}

      <section className="admin-card-grid admin-quest-card-grid">
        {filtered.map((row) => {
          const target = buildQuestCardTargetSummary(row);
          const typeLabel = resolveQuestTypeLabel(row);
          const rewardCopy = getRewardCopy(row);
          const statusLabel = row.isActive ? "Enabled" : "Disabled";
          const lifecycle = row.lifecycleStatus ?? "ACTIVE";
          return (
            <button key={row.id} type="button" className="admin-focus-card admin-quest-focus-card" onClick={() => setSelected(row)}>
              <div className="admin-quest-card-header-row">
                <span className="milestone-chip-icon admin-quest-chip-icon" style={getQuestAccentStyle(row)}>{target.icon}</span>
                <div className="admin-quest-card-heading">
                  <span className="admin-quest-card-title" title={typeLabel}>{typeLabel}</span>
                  <span className="admin-quest-card-target" title={target.primaryLabel}>{target.primaryLabel}</span>
                </div>
              </div>

              <div className="admin-quest-badge-row">
                <span className={`admin-badge ${LIFECYCLE_TONE[lifecycle]}`}>{lifecycle}</span>
                <span className="admin-badge neutral">{target.networkLabel}</span>
                <span className="admin-badge neutral">{statusLabel}</span>
                <span className="admin-badge neutral">{row.validationMode}</span>
              </div>

              {target.secondaryLabel ? <p className="admin-quest-secondary-line" title={target.secondaryLabel}>{target.secondaryLabel}</p> : null}

              <div className="admin-quest-meta-stack">
                {target.handle ? <MetaPill label="Handle" value={`@${target.handle}`} /> : null}
                {target.tweetId ? <MetaPill label="Tweet" value={target.tweetId} /> : null}
                <MetaPill label="Quest" value={row.code} />
                {rewardCopy ? <MetaPill label="Reward" value={rewardCopy} /> : null}
              </div>

              {target.urlLabel ? (
                <p className="admin-quest-url" title={target.url ?? target.urlLabel}>
                  {target.urlLabel}
                </p>
              ) : null}

              <div className="admin-quest-footer">
                <span className="contest-inline-note" title={row.title}>{row.title}</span>
                <span className="contest-inline-note">{formatWindow(row.startAt, row.endAt)}</span>
              </div>
            </button>
          );
        })}
        {!loading && filtered.length === 0 ? <section className="admin-panel"><p className="contest-inline-note">No quests found.</p></section> : null}
      </section>

      {selected ? (
        <div className="contest-modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="contest-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="contest-modal-head">
              <div>
                <h4>{selected.title}</h4>
                <p className="contest-inline-note">{selected.code}</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <p className="contest-inline-note">Lifecycle: {selected.lifecycleStatus ?? "ACTIVE"}</p>
              <p className="contest-inline-note">Validation: {selected.validationMode}</p>
              <p className="contest-inline-note">Reward: {getRewardCopy(selected) ?? `${selected.rewardPoints} pts`}</p>
              <p className="contest-inline-note">Completed users: {selected.analytics?.completedCount ?? 0}</p>
              <p className="contest-inline-note">Progress rows: {selected.analytics?.progressCount ?? 0}</p>
              <p className="contest-inline-note">Distributed points: {selected.analytics?.totalPointsDistributed ?? 0}</p>
              <div className="admin-actions-row">
                <Link href={`/admin/quests/builder?questId=${selected.id}`} className="admin-badge neutral">Edit</Link>
                <button className="admin-badge neutral" disabled={busyId === selected.id} onClick={() => void applyLifecycle(selected.id, selected.isActive ? "DISABLE" : "ENABLE")}>{selected.isActive ? "Disable" : "Enable"}</button>
                <button className="admin-badge neutral" disabled={busyId === selected.id} onClick={() => void applyLifecycle(selected.id, "ARCHIVE")}>Archive</button>
                <button className="admin-badge neutral" disabled={busyId === selected.id} onClick={() => void applyLifecycle(selected.id, "DELETE_SOFT")}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function resolveQuestTypeLabel(row: QuestRow) {
  if (row.type === "SOCIAL_FOLLOW_X") return QUEST_TYPE_LABELS[row.type];
  if (row.type === "SOCIAL_ENGAGEMENT_X") {
    const action = typeof row.config?.socialAction === "string" ? row.config.socialAction : null;
    return SOCIAL_ACTION_LABELS[action ?? ""] ?? QUEST_TYPE_LABELS[row.type];
  }

  return QUEST_TYPE_LABELS[row.type] ?? prettifyToken(row.type);
}

function buildQuestCardTargetSummary(row: QuestRow): QuestCardTargetSummary {
  const config = row.config ?? {};
  const rawTargetUrl = typeof config.targetUrl === "string" ? config.targetUrl.trim() : "";
  const parsedUrl = parseSocialTargetUrl(rawTargetUrl || null);
  const handle = rawTargetUrl ? extractXHandle(rawTargetUrl) : null;
  const tweetId = rawTargetUrl ? extractTweetId(rawTargetUrl) : null;
  const normalizedUrl = parsedUrl.normalized ?? (rawTargetUrl || null);
  const urlLabel = normalizedUrl ? truncateMiddle(normalizedUrl, 54) : null;

  if (row.type === "SOCIAL_FOLLOW_X") {
    return {
      networkLabel: parsedUrl.isXDomain ? "X" : "Social",
      kindLabel: "Account",
      icon: "𝕏",
      primaryLabel: handle ? `@${handle}` : "X account target",
      secondaryLabel: normalizedUrl ? `Follow target · ${truncateMiddle(normalizedUrl, 48)}` : "Follow target URL unavailable",
      tweetId: null,
      handle,
      url: normalizedUrl,
      urlLabel,
      contextLabel: handle ? `Account @${handle}` : normalizedUrl ? `Profile ${normalizedUrl}` : null,
    };
  }

  if (row.type === "SOCIAL_ENGAGEMENT_X") {
    const labelAction = resolveQuestTypeLabel(row);
    const primary = handle ? `${labelAction} · @${handle}` : labelAction;
    const secondaryParts = [
      tweetId ? `Post ${tweetId}` : "Post target",
      normalizedUrl ? truncateMiddle(normalizedUrl, 48) : null,
    ].filter(Boolean);

    return {
      networkLabel: parsedUrl.isXDomain ? "X" : "Social",
      kindLabel: "Post",
      icon: "✦",
      primaryLabel: primary,
      secondaryLabel: secondaryParts.join(" · "),
      tweetId,
      handle,
      url: normalizedUrl,
      urlLabel,
      contextLabel: tweetId ? `Post: ${tweetId}` : normalizedUrl ? `Post URL ${normalizedUrl}` : null,
    };
  }

  return {
    networkLabel: "Quest",
    kindLabel: "General",
    icon: "◆",
    primaryLabel: row.title,
    secondaryLabel: row.code,
    tweetId: null,
    handle: null,
    url: normalizedUrl,
    urlLabel,
    contextLabel: row.title,
  };
}

function getRewardCopy(row: QuestRow) {
  const parts: string[] = [];
  if (row.rewardPoints > 0) parts.push(`${row.rewardPoints} pts`);
  if (row.rewardPackDefinitionCode) {
    parts.push(`${Math.max(row.rewardPackQuantity ?? 1, 1)}× ${row.rewardPackDefinitionCode}`);
  }
  return parts.join(" + ") || null;
}

function getQuestAccentStyle(row: QuestRow) {
  if (row.type === "SOCIAL_FOLLOW_X") {
    return { background: "rgba(168,85,247,0.18)", color: "#d8b4fe" };
  }
  if (row.type === "SOCIAL_ENGAGEMENT_X") {
    return { background: "rgba(59,130,246,0.18)", color: "#93c5fd" };
  }
  return { background: "rgba(148,163,184,0.18)", color: "#cbd5e1" };
}

function formatWindow(startAt?: string | null, endAt?: string | null) {
  if (!startAt && !endAt) return "Always on";
  if (startAt && endAt) return `${formatCompactDate(startAt)} → ${formatCompactDate(endAt)}`;
  if (startAt) return `From ${formatCompactDate(startAt)}`;
  return `Until ${formatCompactDate(endAt)}`;
}

function formatCompactDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function prettifyToken(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const head = Math.ceil((maxLength - 1) / 2);
  const tail = Math.floor((maxLength - 1) / 2);
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function extractTweetId(urlValue: string) {
  try {
    const parsed = new URL(urlValue);
    const match = parsed.pathname.match(/\/status\/(\d+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function extractXHandle(urlValue: string) {
  try {
    const parsed = new URL(urlValue);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    const candidate = segments[0]?.replace(/^@/, "") ?? "";
    if (!candidate || candidate.toLowerCase() === "i" || candidate.toLowerCase() === "home") return null;
    return /^[A-Za-z0-9_]{1,15}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="admin-quest-meta-pill" title={`${label}: ${value}`}>
      <strong>{label}</strong>
      <span>{value}</span>
    </span>
  );
}
