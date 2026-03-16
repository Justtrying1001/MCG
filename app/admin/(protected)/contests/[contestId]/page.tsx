"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

function newIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

type OverviewPayload = {
  contest: {
    id: string;
    code: string;
    title: string;
    status: ContestStatus;
    liveAt: string | null;
    lockAt: string | null;
    endsAt: string | null;
    _count: {
      entries: number;
      scores: number;
      rankings: number;
      settlements: number;
    };
  };
  progress: {
    entries: number;
    scoringReady: boolean;
    rankingGenerated: boolean;
    settlementDone: boolean;
  };
  allowedTransitions: ContestStatus[];
  blockers: string[];
};

type SnapshotToken = {
  geckoId: string;
  slug: string;
  displayName: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  marketCapRank: number | null;
  capturedAt: string;
};

type SnapshotPhaseData = {
  tokenCount: number;
  capturedWithPrice: number;
  capturedAt: string | null;
  tokens: SnapshotToken[];
};

type SnapshotPayload = {
  ok: boolean;
  contestId: string;
  hasStartSnapshot: boolean;
  hasEndSnapshot: boolean;
  start: SnapshotPhaseData;
  end: SnapshotPhaseData;
};

export default function ContestOverviewPage({ params }: { params: { contestId: string } }) {
  const router = useRouter();
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyStop, setBusyStop] = useState(false);
  const [busyCapture, setBusyCapture] = useState<"START" | "END" | null>(null);
  const [busyRebuildRankings, setBusyRebuildRankings] = useState(false);
  const [message, setMessage] = useState("");
  const [showStartDetail, setShowStartDetail] = useState(false);
  const [showEndDetail, setShowEndDetail] = useState(false);

  const loadSnapshots = async () => {
    setSnapshotsLoading(true);
    const response = await fetch(`/api/internal/contest-runs/${params.contestId}/snapshots`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as SnapshotPayload;
      setSnapshots(payload);
    }
    setSnapshotsLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [overviewRes] = await Promise.all([
        fetch(`/api/internal/contest-runs/${params.contestId}/overview`, { cache: "no-store" }),
        loadSnapshots(),
      ]);

      if (!overviewRes.ok) {
        const payload = (await overviewRes.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Cannot load contest overview");
        setLoading(false);
        return;
      }

      const payload = (await overviewRes.json()) as OverviewPayload;
      setData(payload);
      setLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.contestId]);

  const stopContest = async () => {
    if (!data) return;
    if (!window.confirm("Stop this contest? It will be moved to CANCELED status.")) return;
    setBusyStop(true);
    setMessage("");
    setError("");

    const validateRes = await fetch(`/api/internal/contest-runs/${params.contestId}/transitions/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPhase: "CANCELED", reasonCode: "LIFECYCLE_CONTROL" }),
    });
    const validatePayload = (await validateRes.json().catch(() => null)) as { validationToken?: string; blocking?: boolean; error?: string } | null;
    if (!validateRes.ok || !validatePayload?.validationToken || validatePayload.blocking) {
      setError(validatePayload?.error ?? "Cannot stop contest: validation failed");
      setBusyStop(false);
      return;
    }

    const execRes = await fetch(`/api/internal/contests/${params.contestId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": newIdempotencyKey("stop-contest") },
      body: JSON.stringify({ status: "CANCELED", reasonCode: "LIFECYCLE_CONTROL", validationToken: validatePayload.validationToken }),
    });
    const execPayload = (await execRes.json().catch(() => null)) as { error?: string; contest?: { status: ContestStatus } } | null;
    if (!execRes.ok) {
      setError(execPayload?.error ?? "Cannot stop contest");
    } else {
      setMessage("Contest stopped successfully.");
      setData((prev: OverviewPayload | null) => prev ? { ...prev, contest: { ...prev.contest, status: execPayload?.contest?.status ?? "CANCELED" } } : prev);
    }
    setBusyStop(false);
  };

  const deleteContest = async () => {
    const confirmed = window.confirm("Delete this contest? This action is permanent. CANCELED contests will be fully purged with their linked entries/rankings/scores/settlements.");
    if (!confirmed) return;
    setBusyDelete(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/internal/contests/${params.contestId}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(payload?.error ?? "Cannot delete contest");
      setBusyDelete(false);
      return;
    }
    setMessage("Contest deleted successfully.");
    setBusyDelete(false);
    router.push("/admin/contests");
    router.refresh();
  };

  const captureSnapshot = async (phase: "START" | "END", isRecapture = false) => {
    const msg = isRecapture
      ? `This will overwrite the existing ${phase} snapshot. Only do this if price data is missing. Confirm?`
      : `Capture ${phase} snapshot now? This will fetch current CoinGecko prices for all eligible tokens.`;
    const confirmed = window.confirm(msg);
    if (!confirmed) return;
    setBusyCapture(phase);
    setMessage("");
    setError("");
    const endpoint = phase === "START"
      ? `/api/internal/contest-runs/${params.contestId}/snapshots/start`
      : `/api/internal/contest-runs/${params.contestId}/snapshots/end`;
    const response = await fetch(endpoint, { method: "POST" });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; tokenCount?: number; capturedCount?: number; missingCount?: number } | null;
    if (!response.ok) {
      setError(payload?.error ?? `Cannot capture ${phase} snapshot`);
    } else {
      setMessage(`${phase} snapshot captured — ${payload?.capturedCount ?? 0}/${payload?.tokenCount ?? 0} tokens captured, ${payload?.missingCount ?? 0} missing.`);
      await loadSnapshots();
    }
    setBusyCapture(null);
  };

  const rebuildRankings = async () => {
    if (!window.confirm("Rebuild rankings now? This will recompute all scores and regenerate rankings.")) return;
    setBusyRebuildRankings(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/internal/contest-runs/${params.contestId}/scoring/compute`, {
      method: "POST",
      headers: { "Idempotency-Key": newIdempotencyKey("rebuild-rankings") },
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; rankingsCount?: number; userScoresCount?: number } | null;
    if (!response.ok) {
      setError(payload?.error ?? "Cannot rebuild rankings");
    } else {
      setMessage(`Rankings rebuilt — ${payload?.rankingsCount ?? 0} rankings generated for ${payload?.userScoresCount ?? 0} users.`);
      const overviewRes = await fetch(`/api/internal/contest-runs/${params.contestId}/overview`, { cache: "no-store" });
      if (overviewRes.ok) setData((await overviewRes.json()) as OverviewPayload);
    }
    setBusyRebuildRankings(false);
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <Link href="/admin/contests" className="contest-inline-note">← Back to contest catalog</Link>
      </section>

      {loading ? <section className="contest-section"><p className="contest-inline-note">Loading overview…</p></section> : null}
      {message ? <section className="contest-section"><p className="contest-inline-note">{message}</p></section> : null}
      {error ? <section className="contest-section"><p className="contest-error">{error}</p></section> : null}

      {data ? (
        <>
          <section className="contest-section">
            <div className="contest-card-top">
              <p className="contest-code">{data.contest.code}</p>
              <span className={`contest-status status-${data.contest.status.toLowerCase()}`}>{data.contest.status}</span>
            </div>
            <h1 className="page-title">{data.contest.title}</h1>
            <div className="contest-meta-grid">
              <Meta label="Entries" value={String(data.contest._count.entries)} />
              <Meta label="Scores" value={String(data.contest._count.scores)} />
              <Meta label="Rankings" value={String(data.contest._count.rankings)} />
              <Meta label="Settlements" value={String(data.contest._count.settlements)} />
              <Meta label="Goes Live" value={formatDate(data.contest.liveAt)} />
              <Meta label="Lock" value={formatDate(data.contest.lockAt)} />
              <Meta label="Ends" value={formatDate(data.contest.endsAt)} />
            </div>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Operational progress</h2>
            <div className="contest-meta-grid">
              <Meta label="Entries collected" value={String(data.progress.entries)} />
              <Meta label="Scoring readiness" value={data.progress.scoringReady ? "READY" : "BLOCKED"} />
              <Meta label="Ranking generated" value={data.progress.rankingGenerated ? "YES" : "NO"} />
              <Meta label="Settlement status" value={data.progress.settlementDone ? "DONE" : "PENDING"} />
            </div>
          </section>

          <section className="contest-section" style={{ display: "grid", gap: "0.75rem" }}>
            <h2 className="contest-section-title">Pipeline status</h2>

            {snapshotsLoading ? (
              <p className="contest-inline-note">Loading snapshot data…</p>
            ) : snapshots ? (
              <>
                <div style={{ display: "grid", gap: "0.4rem" }}>
                  <PipelineRow
                    label="START Snapshot"
                    ok={snapshots.hasStartSnapshot && snapshots.start.capturedWithPrice > 0}
                    warn={snapshots.hasStartSnapshot && snapshots.start.capturedWithPrice === 0}
                    detail={
                      snapshots.hasStartSnapshot
                        ? `${snapshots.start.tokenCount} tokens captured, ${snapshots.start.capturedWithPrice} with price${snapshots.start.capturedAt ? ` — at ${formatDate(snapshots.start.capturedAt)}` : ""}`
                        : "Not captured — will trigger automatically on LIVE transition"
                    }
                    expandable={snapshots.start.tokens.length > 0}
                    expanded={showStartDetail}
                    onToggle={() => setShowStartDetail((v) => !v)}
                  />
                  {snapshots.hasStartSnapshot && snapshots.start.capturedWithPrice < snapshots.start.tokenCount && snapshots.start.tokenCount > 0 ? (
                    <p className="contest-inline-note" style={{ color: "#c0392b", paddingLeft: "1.8rem" }}>
                      ⚠ {snapshots.start.tokenCount - snapshots.start.capturedWithPrice} token{snapshots.start.tokenCount - snapshots.start.capturedWithPrice > 1 ? "s" : ""} captured but {snapshots.start.capturedWithPrice === 0 ? "none have" : "some have no"} price data — missing coingeckoId mapping or CoinGecko fetch failed
                    </p>
                  ) : null}
                  <PipelineRow
                    label="END Snapshot"
                    ok={snapshots.hasEndSnapshot && snapshots.end.capturedWithPrice > 0}
                    warn={snapshots.hasEndSnapshot && snapshots.end.capturedWithPrice === 0}
                    detail={
                      snapshots.hasEndSnapshot
                        ? `${snapshots.end.tokenCount} tokens captured, ${snapshots.end.capturedWithPrice} with price${snapshots.end.capturedAt ? ` — at ${formatDate(snapshots.end.capturedAt)}` : ""}`
                        : "Not captured yet"
                    }
                    expandable={snapshots.end.tokens.length > 0}
                    expanded={showEndDetail}
                    onToggle={() => setShowEndDetail((v) => !v)}
                  />
                  {snapshots.hasEndSnapshot && snapshots.end.capturedWithPrice < snapshots.end.tokenCount && snapshots.end.tokenCount > 0 ? (
                    <p className="contest-inline-note" style={{ color: "#c0392b", paddingLeft: "1.8rem" }}>
                      ⚠ {snapshots.end.tokenCount - snapshots.end.capturedWithPrice} token{snapshots.end.tokenCount - snapshots.end.capturedWithPrice > 1 ? "s" : ""} have no price data
                    </p>
                  ) : null}
                  <PipelineRow label="Scoring" ok={data.progress.scoringReady} detail={data.progress.scoringReady ? "Calculated" : "Pending"} />
                  <PipelineRow label="Ranking" ok={data.progress.rankingGenerated} detail={data.progress.rankingGenerated ? "Generated" : "Pending"} />
                  <PipelineRow label="Settlement" ok={data.progress.settlementDone} detail={data.progress.settlementDone ? "Done" : "Pending"} />
                </div>

                {showStartDetail && snapshots.start.tokens.length > 0 ? (
                  <SnapshotTable phase="START" tokens={snapshots.start.tokens} />
                ) : null}

                {showEndDetail && snapshots.end.tokens.length > 0 ? (
                  <SnapshotTable phase="END" tokens={snapshots.end.tokens} />
                ) : null}

                {data.contest.status === "LIVE" && !snapshots.hasStartSnapshot ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Button variant="ghost" onClick={() => void captureSnapshot("START")} disabled={busyCapture !== null}>
                      {busyCapture === "START" ? "Capturing…" : "Capture START snapshot now"}
                    </Button>
                    <p className="contest-inline-note" style={{ color: "#c0392b" }}>Contest is LIVE but START snapshot is missing — action required.</p>
                  </div>
                ) : null}

                {data.contest.status === "LIVE" && snapshots.hasStartSnapshot && snapshots.start.capturedWithPrice === 0 ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Button variant="ghost" onClick={() => void captureSnapshot("START", true)} disabled={busyCapture !== null} style={{ color: "#c0392b", borderColor: "#c0392b" }}>
                      {busyCapture === "START" ? "Capturing…" : "⚠ Re-capture START snapshot"}
                    </Button>
                    <p className="contest-inline-note" style={{ color: "#c0392b" }}>START snapshot exists but has 0 prices — scoring will produce all zeros.</p>
                  </div>
                ) : null}

                {data.contest.status === "LIVE" && snapshots.hasStartSnapshot && !snapshots.hasEndSnapshot ? (
                  <Button variant="ghost" onClick={() => void captureSnapshot("END")} disabled={busyCapture !== null}>
                    {busyCapture === "END" ? "Capturing…" : "Capture END snapshot now"}
                  </Button>
                ) : null}

                {data.contest._count.scores > 0 && !data.progress.rankingGenerated ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Button
                      variant="ghost"
                      onClick={() => void rebuildRankings()}
                      disabled={busyRebuildRankings}
                      style={{ color: "#e67e22", borderColor: "#e67e22" }}
                    >
                      {busyRebuildRankings ? "Rebuilding…" : "⚠ Rebuild rankings"}
                    </Button>
                    <p className="contest-inline-note" style={{ color: "#e67e22" }}>
                      Scores computed ({data.contest._count.scores}) but no rankings generated — use this button to fix.
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="contest-error">Could not load snapshot data.</p>
            )}
          </section>

          <section className="contest-section" style={{ display: "grid", gap: "0.5rem" }}>
            <h2 className="contest-section-title">Blocking issues / warnings</h2>
            {data.blockers.length > 0 ? data.blockers.map((item) => <p key={item} className="contest-error">{item}</p>) : <p className="contest-inline-note">No blockers currently detected.</p>}
            <p className="contest-inline-note">Allowed next transitions: {data.allowedTransitions.length > 0 ? data.allowedTransitions.join(", ") : "none"}</p>
          </section>

          <section className="contest-section" style={{ display: "grid", gap: "0.4rem" }}>
            <h2 className="contest-section-title">Milestones</h2>
            <p className="contest-inline-note">Goes Live: {formatDate(data.contest.liveAt)}</p>
            <p className="contest-inline-note">Lock: {formatDate(data.contest.lockAt)}</p>
            <p className="contest-inline-note">End: {formatDate(data.contest.endsAt)}</p>
          </section>

          <section className="contest-section" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
            <Link href={`/admin/contests/${params.contestId}/lifecycle`} className="contest-inline-note">Manage lifecycle</Link>
            <Link href={`/admin/contests/${params.contestId}/scoring`} className="contest-inline-note">Scoring &amp; Settlement</Link>
            <Link href={`/admin/contests/${params.contestId}/audit`} className="contest-inline-note">Audit log</Link>
            {(data.contest.status === "OPEN" || data.contest.status === "LOCKED" || data.contest.status === "LIVE") ? (
              <Button variant="ghost" onClick={() => void stopContest()} disabled={busyStop} style={{ color: "#e67e22", borderColor: "#e67e22" }}>
                {busyStop ? "Stopping…" : "Stop contest"}
              </Button>
            ) : null}
            {(data.contest.status === "CANCELED" || (data.contest._count.entries === 0 && data.contest._count.scores === 0 && data.contest._count.rankings === 0 && data.contest._count.settlements === 0)) ? (
              <Button variant="ghost" onClick={() => void deleteContest()} disabled={busyDelete}>Delete contest</Button>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

function PipelineRow({
  label,
  ok,
  warn,
  detail,
  expandable,
  expanded,
  onToggle,
}: {
  label: string;
  ok: boolean;
  warn?: boolean;
  detail: string;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const icon = ok ? "✓" : warn ? "⚠" : "✗";
  const color = ok ? "#27ae60" : warn ? "#e67e22" : "#c0392b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <span style={{ fontSize: "1rem", color, minWidth: "1.2rem" }}>{icon}</span>
      <span className="contest-meta-label" style={{ minWidth: "9rem" }}>{label}</span>
      <span className="contest-inline-note" style={{ flex: 1 }}>{detail}</span>
      {expandable && onToggle ? (
        <button
          onClick={onToggle}
          className="contest-inline-note"
          style={{ background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
        >
          {expanded ? "hide detail" : "voir détail"}
        </button>
      ) : null}
    </div>
  );
}

function SnapshotTable({ phase, tokens }: { phase: "START" | "END"; tokens: SnapshotToken[] }) {
  return (
    <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
      <p className="contest-meta-label" style={{ marginBottom: "0.4rem" }}>{phase} Snapshot detail ({tokens.length} tokens)</p>
      <table style={{ borderCollapse: "collapse", fontSize: "0.8rem", width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
            <Th>Token</Th>
            <Th>CoinGecko ID</Th>
            <Th>Price USD</Th>
            <Th>Market Cap</Th>
            <Th>Volume 24h</Th>
            <Th>MC Rank</Th>
            <Th>Captured at</Th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.geckoId} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <Td>{token.displayName || token.slug}</Td>
              <Td>{token.geckoId}</Td>
              <Td>{token.priceUsd !== null ? formatUsd(token.priceUsd, 6) : "—"}</Td>
              <Td>{token.marketCapUsd !== null ? formatMillions(token.marketCapUsd) : "—"}</Td>
              <Td>{token.volume24hUsd !== null ? formatMillions(token.volume24hUsd) : "—"}</Td>
              <Td>{token.marketCapRank !== null ? `#${token.marketCapRank}` : "—"}</Td>
              <Td>{formatDate(token.capturedAt)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "0.3rem 0.6rem", textAlign: "left", fontWeight: 600, color: "#666" }}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "0.3rem 0.6rem", color: "#333" }}>{children}</td>;
}

function Meta({ label, value }: { label: string; value: string }) {
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

function formatUsd(value: number, decimals = 2) {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(decimals)}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: decimals })}`;
}

function formatMillions(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}
