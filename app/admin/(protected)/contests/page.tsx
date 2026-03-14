"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatStrip,
  AdminStatusBadge,
  AdminToolbar,
} from "@/components/admin/AdminUi";

type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
type ContestStage = "TEAM_BUILDING" | "TEAM_LOCK" | "CONTEST_RUNNING" | "CONTEST_ENDED" | "SCORING_COMPUTING" | "RESULTS_READY";

type AdminContest = {
  id: string;
  code: string;
  title: string;
  status: ContestStatus;
  configPublishedAt: string | null;
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  _count: { entries: number; rankings: number; settlements: number; scores: number };
};

type ConsolePayload = {
  contest: AdminContest & {
    rules: Array<{ id: string; cardSetId: string | null; maxRosterSize: number | null; cardSet: { id: string; code: string; displayName: string } | null }>;
  };
  players: Array<{
    entryId: string;
    userId: string;
    username: string;
    displayName: string;
    entryStatus: string;
    submittedAt: string;
    finalScore: number | null;
    ranking: number | null;
    lineup: Array<{
      rosterLockId: string;
      cardInstanceId: string;
      lockedAt: string;
      card: {
        id: string;
        name: string;
        imageUrl: string | null;
        tokenProjectId: string;
        tokenProjectName: string;
        tokenSlug: string;
        rarity: string;
        edition: string;
      };
    }>;
  }>;
  snapshots: {
    START: Array<{ id: string; tokenProject: { displayName: string; slug: string }; priceUsd: string | null; volume24hUsd: string | null; marketCapUsd: string | null; marketCapRank: number | null; capturedAt: string }>;
    END: Array<{ id: string; tokenProject: { displayName: string; slug: string }; priceUsd: string | null; volume24hUsd: string | null; marketCapUsd: string | null; marketCapRank: number | null; capturedAt: string }>;
  };
  scoring: {
    tokenScores: Array<{ id: string; tokenProject: { displayName: string; slug: string }; score: number; priceChange: number | null; marketCapChange: number | null; volumeChange: number | null; rankChange: number | null }>;
    breakdownRows: Array<{ id: string; entry: { userId: string; user: { xUsername: string; displayName: string } }; tokenProject: { displayName: string }; cardInstance: { cardTemplate: { name: string; imageUrl: string | null; rarity: { code: string }; edition: { code: string } } }; baseScore: number; rarityMultiplier: number; editionMultiplier: number; finalScore: number }>;
    usersWithBreakdown: number;
  };
  diagnostics: {
    hasStartSnapshot: boolean;
    hasEndSnapshot: boolean;
    scoringCalculated: boolean;
    rankingGenerated: boolean;
    settlementDone: boolean;
  };
};

const STATUS_OPTIONS: Array<ContestStatus | "ALL"> = ["ALL", "DRAFT", "OPEN", "LOCKED", "LIVE", "SETTLED", "CANCELED"];

export default function AdminContestsCatalogPage() {
  const [contests, setContests] = useState<AdminContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContestStatus | "ALL">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const [consoleData, setConsoleData] = useState<ConsolePayload | null>(null);
  const [consoleLoading, setConsoleLoading] = useState(false);
  const [consoleError, setConsoleError] = useState("");

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

  const openConsole = async (contestId: string) => {
    setSelectedContestId(contestId);
    setConsoleLoading(true);
    setConsoleError("");
    setConsoleData(null);

    const response = await fetch(`/api/internal/contest-runs/${contestId}/console`, { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setConsoleError(payload?.error ?? "Cannot load contest operator console");
      setConsoleLoading(false);
      return;
    }

    const payload = (await response.json()) as ConsolePayload;
    setConsoleData(payload);
    setConsoleLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contests.filter((contest) => {
      if (statusFilter !== "ALL" && contest.status !== statusFilter) return false;
      if (!q) return true;
      return contest.code.toLowerCase().includes(q) || contest.title.toLowerCase().includes(q);
    });
  }, [contests, query, statusFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const active = contests.filter((c) => ["OPEN", "LOCKED", "LIVE"].includes(c.status)).length;
    const upcoming = contests.filter((c) => c.startsAt && new Date(c.startsAt).getTime() > now).length;
    const running = contests.filter((c) => c.status === "LIVE").length;
    const finished = contests.filter((c) => c.status === "SETTLED").length;
    return { active, upcoming, running, finished };
  }, [contests]);

  const runAction = async (contestId: string, action: "publish" | "unpublish" | "archive" | "delete" | "stop") => {
    if (action === "delete") {
      const confirmed = window.confirm("Delete this contest? This action is permanent.");
      if (!confirmed) return;
    }
    if (action === "stop") {
      const confirmed = window.confirm("Stop contest and move to CANCELED phase?");
      if (!confirmed) return;
    }

    setBusyId(contestId);
    setMessage("");

    let response: Response;
    if (action === "publish") {
      response = await fetch(`/api/internal/contest-configs/${contestId}/publish`, { method: "POST" });
    } else if (action === "delete") {
      response = await fetch(`/api/internal/contests/${contestId}`, { method: "DELETE" });
    } else if (action === "archive") {
      response = await fetch(`/api/internal/contests/${contestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ARCHIVE" }),
      });
    } else if (action === "unpublish") {
      response = await fetch(`/api/internal/contests/${contestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNPUBLISH" }),
      });
    } else {
      const validate = await fetch(`/api/internal/contest-runs/${contestId}/transitions/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPhase: "CANCELED", reasonCode: "MANUAL_STOP_FROM_CONSOLE" }),
      });
      const validation = (await validate.json().catch(() => null)) as { error?: string; validationToken?: string; blocking?: boolean; issues?: Array<{ message: string }> } | null;
      if (!validate.ok || !validation?.validationToken) {
        setError(validation?.error ?? "Cannot validate stop action");
        setBusyId(null);
        return;
      }
      if (validation.blocking) {
        setError((validation.issues ?? []).map((item) => item.message).join("; ") || "Stop action blocked");
        setBusyId(null);
        return;
      }
      response = await fetch(`/api/internal/contests/${contestId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `contest-stop-${contestId}-${Date.now()}`,
        },
        body: JSON.stringify({ status: "CANCELED", reasonCode: "MANUAL_STOP_FROM_CONSOLE", validationToken: validation.validationToken }),
      });
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? `Cannot ${action} contest`);
    } else {
      setError("");
      setMessage(action === "delete" ? "Contest deleted." : `Contest ${action} successful.`);
      await load();
      if (selectedContestId === contestId) {
        await openConsole(contestId);
      }
    }
    setBusyId(null);
  };

  return (
    <div className="admin-page admin-v2-page contest-console-page">
      <AdminPageHeader
        title="Contest Operator Console"
        subtitle="Pilot tournament lifecycle, diagnose technical state, and execute critical actions from one premium control surface."
        actions={
          <div className="admin-v2-action-row">
            <Link href="/admin/contests/create" className="contest-console-cta">Create Contest</Link>
            <Button variant="ghost" onClick={() => void load()}>Refresh</Button>
          </div>
        }
      />

      <AdminStatStrip
        items={[
          { label: "Active contests", value: String(stats.active), tone: stats.active > 0 ? "success" : "neutral" },
          { label: "Upcoming", value: String(stats.upcoming), tone: stats.upcoming > 0 ? "warn" : "neutral" },
          { label: "Running", value: String(stats.running), tone: stats.running > 0 ? "success" : "neutral" },
          { label: "Finished", value: String(stats.finished), tone: stats.finished > 0 ? "neutral" : "neutral" },
          { label: "Total", value: String(contests.length), tone: "neutral" },
        ]}
      />

      <AdminToolbar>
        <input className="input" placeholder="Search code / title" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContestStatus | "ALL") }>
          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status === "ALL" ? "All statuses" : status}</option>)}
        </select>
        <AdminStatusBadge tone="neutral" label={`${rows.length} contests`} />
      </AdminToolbar>

      {loading ? <AdminPanel><AdminEmptyState title="Loading contests…" /></AdminPanel> : null}
      {message ? <AdminPanel><p className="contest-inline-note">{message}</p></AdminPanel> : null}
      {error ? <AdminPanel><p className="contest-error">{error}</p></AdminPanel> : null}

      {!loading ? (
        <section className="contest-console-grid">
          {rows.map((contest) => {
            const stage = getContestStage(contest);
            return (
              <article key={contest.id} className="contest-console-card">
                <div className="contest-console-card-head">
                  <div>
                    <p className="contest-console-code">{contest.code}</p>
                    <h3>{contest.title}</h3>
                  </div>
                  <div className="contest-console-card-badges">
                    <AdminStatusBadge tone={statusTone(contest.status)} label={contest.status} />
                    <AdminStatusBadge tone={stageTone(stage)} label={stageLabel(stage)} />
                  </div>
                </div>

                <div className="contest-console-kpis">
                  <MiniMetric label="Entries" value={contest._count.entries} />
                  <MiniMetric label="Scores" value={contest._count.scores} />
                  <MiniMetric label="Rankings" value={contest._count.rankings} />
                  <MiniMetric label="Settlements" value={contest._count.settlements} />
                </div>

                <div className="contest-console-meta">
                  <p><strong>Start:</strong> {fmt(contest.startsAt)}</p>
                  <p><strong>Lock:</strong> {fmt(contest.lockAt)}</p>
                  <p><strong>End:</strong> {fmt(contest.endsAt)}</p>
                  <p><strong>Settlement:</strong> {contest._count.settlements > 0 ? "Done" : "Pending"}</p>
                </div>

                <div className="contest-console-actions">
                  <button className="admin-v2-link-chip" onClick={() => void openConsole(contest.id)}>Open console</button>
                  <Link href={`/admin/contests/create?contestId=${contest.id}`} className="admin-v2-link-chip">Edit</Link>
                  {contest.status !== "CANCELED" ? <button className="admin-v2-link-chip" disabled={busyId === contest.id} onClick={() => void runAction(contest.id, "stop")}>Stop</button> : null}
                  {contest.status !== "CANCELED" ? <button className="admin-v2-link-chip" disabled={busyId === contest.id} onClick={() => void runAction(contest.id, "archive")}>Archive</button> : null}
                  <button className="admin-v2-link-chip contest-danger-chip" disabled={busyId === contest.id} onClick={() => void runAction(contest.id, "delete")}>Delete</button>
                </div>
              </article>
            );
          })}
          {rows.length === 0 ? <AdminPanel><AdminEmptyState title="No contests found." /></AdminPanel> : null}
        </section>
      ) : null}

      {selectedContestId ? (
        <div className="contest-modal-overlay" role="presentation" onClick={() => setSelectedContestId(null)}>
          <div className="contest-modal contest-console-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="contest-modal-head">
              <h3>Contest Operator Console</h3>
              <button className="admin-v2-link-chip" onClick={() => setSelectedContestId(null)}>Close</button>
            </div>

            <div className="contest-console-modal-body">
              {consoleLoading ? <p className="contest-inline-note">Loading operator data…</p> : null}
              {consoleError ? <p className="contest-error">{consoleError}</p> : null}

              {consoleData ? (
                <>
                  <section className="contest-console-section">
                    <div className="contest-console-card-head">
                      <div>
                        <p className="contest-console-code">{consoleData.contest.code}</p>
                        <h2>{consoleData.contest.title}</h2>
                      </div>
                      <div className="contest-console-card-badges">
                        <AdminStatusBadge tone={statusTone(consoleData.contest.status)} label={consoleData.contest.status} />
                        <AdminStatusBadge tone={stageTone(getContestStage(consoleData.contest))} label={stageLabel(getContestStage(consoleData.contest))} />
                      </div>
                    </div>
                    <div className="contest-console-timeline">{renderTimeline(getContestStage(consoleData.contest))}</div>
                  </section>

                  <section className="contest-console-section">
                    <h4>Overview · Technical diagnostics</h4>
                    <div className="contest-console-kpis">
                      <MiniMetric label="Entries" value={consoleData.contest._count.entries} />
                      <MiniMetric label="Scores" value={consoleData.contest._count.scores} />
                      <MiniMetric label="Rankings" value={consoleData.contest._count.rankings} />
                      <MiniMetric label="Settlements" value={consoleData.contest._count.settlements} />
                    </div>
                    <div className="contest-console-meta-grid">
                      <p>START snapshot: <strong>{consoleData.diagnostics.hasStartSnapshot ? "Captured" : "Missing"}</strong></p>
                      <p>END snapshot: <strong>{consoleData.diagnostics.hasEndSnapshot ? "Captured" : "Missing"}</strong></p>
                      <p>Scoring: <strong>{consoleData.diagnostics.scoringCalculated ? "Computed" : "Pending"}</strong></p>
                      <p>Ranking: <strong>{consoleData.diagnostics.rankingGenerated ? "Generated" : "Pending"}</strong></p>
                    </div>
                  </section>

                  <section className="contest-console-section">
                    <h4>Players · Teams · Lineups</h4>
                    <div className="contest-console-table">
                      {consoleData.players.map((player) => (
                        <div key={player.entryId} className="contest-console-player-row">
                          <div>
                            <p><strong>@{player.username}</strong> ({player.userId.slice(0, 8)}…)</p>
                            <p className="contest-inline-note">Score: {player.finalScore ?? "—"} · Rank: {player.ranking ?? "—"}</p>
                          </div>
                          <div className="contest-console-lineup">
                            {player.lineup.map((card) => (
                              <div key={card.rosterLockId} className="contest-console-card-tile">
                                {card.card.imageUrl ? <Image src={card.card.imageUrl} alt={card.card.name} width={260} height={180} unoptimized /> : <div className="contest-console-card-placeholder">No image</div>}
                                <p>{card.card.name}</p>
                                <small>{card.card.tokenProjectName} · {card.card.rarity} · {card.card.edition}</small>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {consoleData.players.length === 0 ? <p className="contest-inline-note">No players yet.</p> : null}
                    </div>
                  </section>

                  <section className="contest-console-section">
                    <h4>Snapshots (START / END)</h4>
                    <div className="contest-console-snapshot-grid">
                      <SnapshotTable title="START snapshot" rows={consoleData.snapshots.START} />
                      <SnapshotTable title="END snapshot" rows={consoleData.snapshots.END} />
                    </div>
                  </section>

                  <section className="contest-console-section">
                    <h4>Scoring visibility</h4>
                    <p className="contest-inline-note">Token scores ({consoleData.scoring.tokenScores.length}) and card-level breakdown rows ({consoleData.scoring.breakdownRows.length})</p>
                    <div className="contest-console-snapshot-grid">
                      <div className="contest-console-box">
                        {consoleData.scoring.tokenScores.slice(0, 12).map((row) => (
                          <p key={row.id} className="contest-inline-note"><strong>{row.tokenProject.displayName}</strong>: tokenScore {row.score.toFixed(3)} · Δprice {formatNumber(row.priceChange)} · Δvolume {formatNumber(row.volumeChange)} · Δmcap {formatNumber(row.marketCapChange)} · Δrank {formatNumber(row.rankChange)}</p>
                        ))}
                      </div>
                      <div className="contest-console-box">
                        {consoleData.scoring.breakdownRows.slice(0, 12).map((row) => (
                          <p key={row.id} className="contest-inline-note"><strong>@{row.entry.user.xUsername}</strong> · {row.cardInstance.cardTemplate.name}: tokenScore {row.baseScore.toFixed(3)} × rarity {row.rarityMultiplier.toFixed(2)} × edition {row.editionMultiplier.toFixed(2)} = <strong>{row.finalScore.toFixed(3)}</strong></p>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="contest-console-section contest-console-section-actions">
                    <h4>Actions</h4>
                    <div className="contest-console-actions">
                      <Link href={`/admin/contests/create?contestId=${consoleData.contest.id}`} className="admin-v2-link-chip">Edit contest</Link>
                      <Link href={`/admin/contests/${consoleData.contest.id}/lifecycle`} className="admin-v2-link-chip">Lifecycle</Link>
                      <Link href={`/admin/contests/${consoleData.contest.id}/scoring`} className="admin-v2-link-chip">Scoring</Link>
                      <Link href={`/admin/contests/${consoleData.contest.id}/settlement`} className="admin-v2-link-chip">Settlement</Link>
                      <button className="admin-v2-link-chip" disabled={busyId === consoleData.contest.id} onClick={() => void runAction(consoleData.contest.id, "stop")}>Stop</button>
                      <button className="admin-v2-link-chip" disabled={busyId === consoleData.contest.id} onClick={() => void runAction(consoleData.contest.id, "archive")}>Archive</button>
                      <button className="admin-v2-link-chip contest-danger-chip" disabled={busyId === consoleData.contest.id} onClick={() => void runAction(consoleData.contest.id, "delete")}>Delete</button>
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="contest-console-mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SnapshotTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ id: string; tokenProject: { displayName: string; slug: string }; priceUsd: string | null; volume24hUsd: string | null; marketCapUsd: string | null; marketCapRank: number | null; capturedAt: string }>;
}) {
  return (
    <div className="contest-console-box">
      <h5>{title}</h5>
      {rows.map((row) => (
        <p key={row.id} className="contest-inline-note"><strong>{row.tokenProject.displayName}</strong> · price {row.priceUsd ?? "—"} · volume {row.volume24hUsd ?? "—"} · mcap {row.marketCapUsd ?? "—"} · rank {row.marketCapRank ?? "—"}</p>
      ))}
      {rows.length === 0 ? <p className="contest-inline-note">No snapshot rows yet.</p> : null}
    </div>
  );
}

function renderTimeline(stage: ContestStage) {
  const steps: Array<{ key: ContestStage; label: string }> = [
    { key: "TEAM_BUILDING", label: "Team building" },
    { key: "TEAM_LOCK", label: "Team lock" },
    { key: "CONTEST_RUNNING", label: "Contest running" },
    { key: "CONTEST_ENDED", label: "Contest ended" },
    { key: "SCORING_COMPUTING", label: "Scoring" },
    { key: "RESULTS_READY", label: "Results" },
  ];

  const currentIndex = steps.findIndex((step) => step.key === stage);
  return steps.map((step, index) => (
    <div key={step.key} className={`contest-console-step ${index <= currentIndex ? "is-active" : ""}`}>
      <span>{index + 1}</span>
      <p>{step.label}</p>
    </div>
  ));
}

function getContestStage(contest: AdminContest): ContestStage {
  if (contest._count.rankings > 0) return "RESULTS_READY";
  if (contest.status === "SETTLED" && contest._count.scores > 0) return "SCORING_COMPUTING";
  if (contest.status === "SETTLED") return "CONTEST_ENDED";
  if (contest.status === "LIVE") return "CONTEST_RUNNING";
  if (contest.status === "LOCKED") return "TEAM_LOCK";
  return "TEAM_BUILDING";
}

function stageLabel(stage: ContestStage) {
  if (stage === "TEAM_BUILDING") return "Team building";
  if (stage === "TEAM_LOCK") return "Team lock";
  if (stage === "CONTEST_RUNNING") return "Contest running";
  if (stage === "CONTEST_ENDED") return "Contest ended";
  if (stage === "SCORING_COMPUTING") return "Scoring computing";
  return "Results ready";
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusTone(status: ContestStatus): "neutral" | "success" | "warn" | "danger" {
  if (status === "LIVE") return "success";
  if (status === "OPEN" || status === "LOCKED") return "warn";
  if (status === "CANCELED") return "danger";
  return "neutral";
}

function stageTone(stage: ContestStage): "neutral" | "success" | "warn" | "danger" {
  if (stage === "RESULTS_READY") return "success";
  if (stage === "CONTEST_RUNNING" || stage === "SCORING_COMPUTING") return "warn";
  if (stage === "CONTEST_ENDED") return "danger";
  return "neutral";
}

function formatNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(3);
}
