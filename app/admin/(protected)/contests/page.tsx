"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  _count: { entries: number; settlements: number };
};

const STATUS_OPTIONS: Array<ContestStatus | "ALL"> = ["ALL", "DRAFT", "OPEN", "LOCKED", "LIVE", "SETTLED", "CANCELED"];

export default function AdminContestsLibraryPage() {
  const params = useSearchParams();
  const [contests, setContests] = useState<AdminContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContestStatus | "ALL">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/internal/contests", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot load contests");
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

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contests.filter((contest) => {
      if (statusFilter !== "ALL" && contest.status !== statusFilter) return false;
      if (!q) return true;
      return [contest.code, contest.title, contest.description ?? ""].join(" ").toLowerCase().includes(q);
    });
  }, [contests, query, statusFilter]);

  const runAction = async (contestId: string, action: "publish" | "unpublish" | "archive" | "delete") => {
    if (action === "delete" && !window.confirm("Delete this contest? This action is permanent.")) {
      return;
    }

    setBusyId(contestId);
    setMessage("");
    setError("");

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
      setError(payload?.error ?? `Cannot ${action} contest`);
    } else {
      setMessage(`Contest ${action} successful.`);
      await load();
    }

    setBusyId(null);
  };

  return (
    <div className="admin-v2-page contest-library-page">
      <AdminPageHeader
        title="Contest Library"
        subtitle="Create, edit and publish contests from a clear product-focused library. Technical operations stay in a separate console."
        actions={
          <div className="admin-v2-action-row">
            <Link href="/admin/contests/create" className="contest-console-cta">Create Contest</Link>
            <Link href="/admin/contests/legacy" className="admin-v2-link-chip">Legacy console</Link>
            <Button variant="ghost" onClick={() => void load()}>Refresh</Button>
          </div>
        }
      />

      {params.get("published") === "1" ? (
        <AdminPanel>
          <div className="admin-callout success">
            <p className="contest-inline-note"><strong>Contest published successfully.</strong> It is visible in contest library and ready for user-facing surfaces.</p>
          </div>
        </AdminPanel>
      ) : null}

      <AdminToolbar>
        <input className="input" placeholder="Search title, code or description" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContestStatus | "ALL") }>
          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status === "ALL" ? "All statuses" : status}</option>)}
        </select>
        <AdminStatusBadge tone="neutral" label={`${rows.length} contests`} />
      </AdminToolbar>

      {loading ? <AdminPanel><AdminEmptyState title="Loading contests…" /></AdminPanel> : null}
      {error ? <AdminPanel><p className="contest-error">{error}</p></AdminPanel> : null}
      {message ? <AdminPanel><p className="contest-inline-note">{message}</p></AdminPanel> : null}

      {!loading && rows.length === 0 ? <AdminPanel><AdminEmptyState title="No contests found" description="Adjust filters or create a new contest draft." /></AdminPanel> : null}

      {!loading ? (
        <section className="contest-library-grid">
          {rows.map((contest) => {
            const publishable = contest.status === "DRAFT";
            const unpublishable = Boolean(contest.configPublishedAt) && contest._count.entries === 0;

            return (
              <article key={contest.id} className="contest-library-card">
                <div className="contest-console-card-head">
                  <div>
                    <p className="contest-console-code">{contest.code}</p>
                    <h3>{contest.title}</h3>
                  </div>
                  <AdminStatusBadge tone={statusTone(contest.status)} label={contest.status} />
                </div>

                <p className="contest-inline-note">{contest.description?.trim() || "No description yet."}</p>

                <div className="contest-library-dates">
                  <p><strong>Registration opens:</strong> {fmt(contest.openAt)}</p>
                  <p><strong>Start:</strong> {fmt(contest.liveAt)}</p>
                  <p><strong>Contest ends:</strong> {fmt(contest.endsAt)}</p>
                </div>

                <p className="contest-inline-note">{buildRewardTeaser(contest)}</p>

                <p className="contest-inline-note"><strong>Publish state:</strong> {contest.configPublishedAt ? `Published ${fmt(contest.configPublishedAt)}` : "Not published"} · <strong>Entries:</strong> {contest._count.entries}</p>

                <div className="contest-console-actions">
                  <Link href={`/admin/contests/create?contestId=${contest.id}`} className="admin-v2-link-chip">Edit builder</Link>
                  <Link href={`/admin/contests/${contest.id}/operator`} className="admin-v2-link-chip">Operations</Link>
                  <Link href={`/admin/contests/${contest.id}`} className="admin-v2-link-chip">Overview</Link>
                  <button className="admin-v2-link-chip" disabled={!publishable || busyId === contest.id} onClick={() => void runAction(contest.id, "publish")}>Publish</button>
                  <button className="admin-v2-link-chip" disabled={!unpublishable || busyId === contest.id} onClick={() => void runAction(contest.id, "unpublish")}>Unpublish</button>
                  <button className="admin-v2-link-chip" disabled={contest.status === "CANCELED" || busyId === contest.id} onClick={() => void runAction(contest.id, "archive")}>Archive</button>
                  <button className="admin-v2-link-chip contest-danger-chip" disabled={busyId === contest.id} onClick={() => void runAction(contest.id, "delete")}>Delete</button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
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

function statusTone(status: ContestStatus): "success" | "warn" | "danger" | "neutral" {
  if (status === "OPEN" || status === "LIVE" || status === "SETTLED") return "success";
  if (status === "LOCKED") return "warn";
  if (status === "CANCELED") return "danger";
  return "neutral";
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
