"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  AdminToolbar,
} from "@/components/admin/AdminUi";
import { Button } from "@/components/ui/Button";

type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

type AdminContest = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: ContestStatus;
  configPublishedAt: string | null;
  openAt: string | null;
  liveAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  rewardPolicy: {
    bundles: Array<{
      id: string;
      name: string;
      components: Array<{ type: "POINTS" | "PACK" | "XP"; pointsAmount: number | null; xpAmount: number | null; packQuantity: number | null }>;
    }>;
  } | null;
  _count: { entries: number; scores: number; settlements: number };
};

type CatalogFilter = "ALL" | "DRAFT" | "ACTIVE" | "LIVE" | "SETTLED" | "CANCELED";

const FILTER_OPTIONS: Array<{ value: CatalogFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Open / Active" },
  { value: "LIVE", label: "Live" },
  { value: "SETTLED", label: "Settled" },
  { value: "CANCELED", label: "Canceled" },
];

function newIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function AdminContestsLibraryPage() {
  const params = useSearchParams();
  const [contests, setContests] = useState<AdminContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CatalogFilter>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/internal/contests", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot load battles");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { contests: AdminContest[] };
    setContests(payload.contests ?? []);
    setError("");
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  const statusCounts = useMemo(() => ({
    all: contests.length,
    draft: contests.filter((contest) => contest.status === "DRAFT").length,
    active: contests.filter((contest) => contest.status === "OPEN" || contest.status === "LOCKED").length,
    live: contests.filter((contest) => contest.status === "LIVE").length,
    settled: contests.filter((contest) => contest.status === "SETTLED").length,
    canceled: contests.filter((contest) => contest.status === "CANCELED").length,
  }), [contests]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contests.filter((contest) => {
      if (statusFilter === "DRAFT" && contest.status !== "DRAFT") return false;
      if (statusFilter === "ACTIVE" && contest.status !== "OPEN" && contest.status !== "LOCKED") return false;
      if (statusFilter === "LIVE" && contest.status !== "LIVE") return false;
      if (statusFilter === "SETTLED" && contest.status !== "SETTLED") return false;
      if (statusFilter === "CANCELED" && contest.status !== "CANCELED") return false;
      if (!q) return true;
      return [contest.code, contest.title, contest.description ?? ""].join(" ").toLowerCase().includes(q);
    });
  }, [contests, query, statusFilter]);

  const stopContest = async (contestId: string) => {
    if (!window.confirm("Stop this battle? It will be moved to CANCELED status.")) return;
    setBusyId(contestId);
    setMessage("");
    setError("");

    // Step 1: validate transition
    const validateRes = await fetch(`/api/internal/contest-runs/${contestId}/transitions/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPhase: "CANCELED", reasonCode: "LIFECYCLE_CONTROL" }),
    });
    const validatePayload = (await validateRes.json().catch(() => null)) as { validationToken?: string; blocking?: boolean; error?: string } | null;
    if (!validateRes.ok || !validatePayload?.validationToken || validatePayload.blocking) {
      setError(validatePayload?.error ?? "Cannot stop battle: validation failed");
      setBusyId(null);
      return;
    }

    // Step 2: execute transition
    const execRes = await fetch(`/api/internal/contests/${contestId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": newIdempotencyKey("stop-contest") },
      body: JSON.stringify({ status: "CANCELED", reasonCode: "LIFECYCLE_CONTROL", validationToken: validatePayload.validationToken }),
    });
    const execPayload = (await execRes.json().catch(() => null)) as { error?: string } | null;
    if (!execRes.ok) {
      setError(execPayload?.error ?? "Cannot stop battle");
    } else {
      setMessage("Battle stopped successfully.");
      await load();
    }
    setBusyId(null);
  };

  const runAction = async (contestId: string, action: "publish" | "unpublish" | "archive" | "delete") => {
    if (action === "delete" && !window.confirm("Delete this battle? This action is permanent.")) {
      return;
    }

    setBusyId(contestId);
    setMessage("");
    setError("");
    setOpenMenuId(null);

    let response: Response;
    if (action === "publish") {
      response = await fetch(`/api/internal/contest-configs/${contestId}/publish`, { method: "POST" });
    } else if (action === "delete") {
      response = await fetch(`/api/internal/contests/${contestId}`, { method: "DELETE" });
    } else {
      response = await fetch(`/api/internal/contests/${contestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action === "archive" ? "ARCHIVE" : "UNPUBLISH" }),
      });
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? `Cannot ${action} battle`);
    } else {
      setMessage(`Battle ${action} successful.`);
      await load();
    }

    setBusyId(null);
  };

  return (
    <div className="admin-v2-page contest-library-page">
      <AdminPageHeader
        title="Battle Catalog"
        subtitle="Admin control center for draft, active, live, settled, and canceled battles."
        actions={
          <div className="admin-v2-action-row">
            <Link href="/admin/contests/create" className="contest-console-cta">Create battle</Link>
            <Button variant="ghost" onClick={() => void load()}>Refresh</Button>
          </div>
        }
      />

      <AdminPanel>
        <div className="contest-console-kpis">
          <div className="contest-console-mini-metric"><span>Total</span><strong>{statusCounts.all}</strong></div>
          <div className="contest-console-mini-metric"><span>Draft</span><strong>{statusCounts.draft}</strong></div>
          <div className="contest-console-mini-metric"><span>Open / Active</span><strong>{statusCounts.active}</strong></div>
          <div className="contest-console-mini-metric"><span>Live</span><strong>{statusCounts.live}</strong></div>
        </div>
      </AdminPanel>

      {params.get("published") === "1" ? (
        <AdminPanel>
          <div className="admin-callout success">
            <p className="contest-inline-note"><strong>Battle published successfully.</strong> It is visible in the battle library and ready for user-facing surfaces.</p>
          </div>
        </AdminPanel>
      ) : null}

      <AdminToolbar>
        <input className="input" placeholder="Search battle name, code, or description" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="contest-library-filter-row">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`admin-v2-link-chip ${statusFilter === option.value ? "contest-library-filter-active" : ""}`}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <AdminStatusBadge tone="neutral" label={`${rows.length} visible`} />
      </AdminToolbar>

      {loading ? <AdminPanel><AdminEmptyState title="Loading contests…" /></AdminPanel> : null}
      {error ? <AdminPanel><p className="contest-error">{error}</p></AdminPanel> : null}
      {message ? <AdminPanel><p className="contest-library-muted">{message}</p></AdminPanel> : null}

      {!loading && rows.length === 0 ? <AdminPanel><AdminEmptyState title="No contests found" description="Try another filter or create a new contest draft." /></AdminPanel> : null}

      {!loading ? (
        <section className="contest-library-grid">
          {rows.map((contest) => {
            const isBusy = busyId === contest.id;
            const isStoppable = contest.status === "OPEN" || contest.status === "LOCKED" || contest.status === "LIVE";
            const isDeletable = contest.status === "CANCELED";
            const canDeleteDirectly = ["CANCELED", "SETTLED", "DRAFT"].includes(contest.status);
            const deleteBlocked = !canDeleteDirectly;
            const unpublishable = Boolean(contest.configPublishedAt) && contest._count.entries === 0;
            const isMenuOpen = openMenuId === contest.id;

            return (
              <article key={contest.id} className="contest-library-card">
                <div className="contest-console-card-head">
                  <div>
                    <p className="contest-console-code">{contest.code}</p>
                    <h3 className="contest-library-title">{contest.title}</h3>
                  </div>
                  <span className={`contest-library-status is-${contest.status.toLowerCase()}`}>{contest.status}</span>
                </div>

                <p className="contest-library-description">{contest.description?.trim() || "No description yet."}</p>

                {snapshotIndicator(contest)}

                <div className="contest-library-chip-row">
                  <span className="contest-library-chip">Lifecycle: {contest.status}</span>
                  <span className="contest-library-chip">Entries: {contest._count.entries}</span>
                  <span className="contest-library-chip">Config: {contest.configPublishedAt ? "Published" : "Draft"}</span>
                  <span className="contest-library-chip">Rewards: {buildRewardTeaser(contest)}</span>
                </div>

                <div className="contest-library-kpi-grid">
                  <MetaStat label="Open" value={fmt(contest.openAt)} />
                  <MetaStat label="Lock" value={fmt(contest.lockAt)} />
                  <MetaStat label="End" value={fmt(contest.endsAt)} />
                  <MetaStat label="Scores" value={String(contest._count.scores)} />
                </div>

                <div className="contest-library-actions">
                  <Link href={`/admin/contests/${contest.id}`} className="contest-library-primary-action">Overview</Link>
                  <Link href={`/admin/contests/create?contestId=${contest.id}`} className="admin-v2-link-chip">Edit</Link>

                  {contest.status === "DRAFT" ? (
                    <button
                      className="admin-v2-link-chip"
                      style={{ color: "#27ae60", borderColor: "#27ae60" }}
                      disabled={isBusy}
                      onClick={() => void runAction(contest.id, "publish")}
                    >
                      Publish
                    </button>
                  ) : null}
                  {isStoppable ? (
                    <button
                      className="admin-v2-link-chip"
                      style={{ color: "#e67e22", borderColor: "#e67e22" }}
                      disabled={isBusy}
                      onClick={() => void stopContest(contest.id)}
                    >
                      {isBusy ? "Stopping…" : "Stop"}
                    </button>
                  ) : null}

                  <div className="contest-library-more-menu-wrap">
                    <button
                      className="admin-v2-link-chip contest-library-more-btn"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setOpenMenuId(isMenuOpen ? null : contest.id);
                      }}
                      aria-label="More actions"
                    >
                      ···
                    </button>
                    {isMenuOpen ? (
                      <div className="contest-library-menu" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        {unpublishable ? (
                          <button
                            className="contest-menu-item"
                            disabled={isBusy}
                            onClick={() => void runAction(contest.id, "unpublish")}
                          >
                            Unpublish
                          </button>
                        ) : null}
                        <button
                          className="contest-menu-item"
                          disabled={isBusy || contest.status === "CANCELED"}
                          onClick={() => void runAction(contest.id, "archive")}
                        >
                          Archive
                        </button>
                        <button
                          className="contest-menu-item contest-menu-item--danger"
                          disabled={isBusy || deleteBlocked}
                          title={deleteBlocked ? "Stop the contest first before deleting" : undefined}
                          onClick={() => void runAction(contest.id, "delete")}
                        >
                          Delete
                          {deleteBlocked ? <span className="contest-library-menu-note">Stop first</span> : null}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

function snapshotIndicator(contest: AdminContest) {
  // Only show for LIVE or SETTLED contests where snapshot is expected
  if (contest.status !== "LIVE" && contest.status !== "SETTLED") return null;

  // Proxy: scores > 0 means scoring was calculated which requires snapshots
  const hasSnapshot = contest._count.scores > 0;

  if (hasSnapshot) {
    return <div className="contest-library-strip is-success">✓ START snapshot present</div>;
  }

  if (contest.status === "LIVE") {
    return <div className="contest-library-strip is-danger">✗ START snapshot missing — check overview</div>;
  }

  return null;
}

function buildRewardTeaser(contest: AdminContest) {
  const first = contest.rewardPolicy?.bundles[0];
  if (!first) return "No reward distribution configured yet.";
  const component = first.components[0];
  if (!component) return `${first.name} configured.`;
  if (component.type === "POINTS") return `Top rewards include ${component.pointsAmount ?? 0} points.`;
  if (component.type === "XP") return `Top rewards include ${component.xpAmount ?? 0} XP.`;
  return `Top rewards include ${component.packQuantity ?? 0} pack(s).`;
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="contest-library-kpi-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
