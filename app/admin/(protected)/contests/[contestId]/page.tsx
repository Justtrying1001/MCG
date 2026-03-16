"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

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

type SnapshotPayload = {
  ok: boolean;
  contestId: string;
  hasStartSnapshot: boolean;
  hasEndSnapshot: boolean;
  start: { tokenCount: number; capturedAt: string | null; tokens: SnapshotToken[] };
  end: { tokenCount: number; capturedAt: string | null; tokens: SnapshotToken[] };
};

export default function ContestOverviewPage({ params }: { params: { contestId: string } }) {
  const router = useRouter();
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyCapture, setBusyCapture] = useState<"START" | "END" | null>(null);
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

  const captureSnapshot = async (phase: "START" | "END") => {
    const confirmed = window.confirm(`Capture ${phase} snapshot now? This will fetch current CoinGecko prices for all eligible tokens.`);
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
                    ok={snapshots.hasStartSnapshot}
                    detail={
                      snapshots.hasStartSnapshot
                        ? `${snapshots.start.tokenCount} tokens captured${snapshots.start.capturedAt ? ` — at ${formatDate(snapshots.start.capturedAt)}` : ""}`
                        : "Not captured — will trigger automatically on LIVE transition"
                    }
                    expandable={snapshots.start.tokens.length > 0}
                    expanded={showStartDetail}
                    onToggle={() => setShowStartDetail((v) => !v)}
                  />
                  <PipelineRow
                    label="END Snapshot"
                    ok={snapshots.hasEndSnapshot}
                    detail={
                      snapshots.hasEndSnapshot
                        ? `${snapshots.end.tokenCount} tokens captured${snapshots.end.capturedAt ? ` — at ${formatDate(snapshots.end.capturedAt)}` : ""}`
                        : "Not captured yet"
                    }
                    expandable={snapshots.end.tokens.length > 0}
                    expanded={showEndDetail}
                    onToggle={() => setShowEndDetail((v) => !v)}
                  />
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

                {data.contest.status === "LIVE" && snapshots.hasStartSnapshot && !snapshots.hasEndSnapshot ? (
                  <Button variant="ghost" onClick={() => void captureSnapshot("END")} disabled={busyCapture !== null}>
                    {busyCapture === "END" ? "Capturing…" : "Capture END snapshot now"}
                  </Button>
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

          <section className="contest-section" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <Link href={`/admin/contests/${params.contestId}/lifecycle`} className="contest-inline-note">Lifecycle control panel</Link>
            <Link href={`/admin/contests/${params.contestId}/scoring`} className="contest-inline-note">Scoring workbench</Link>
            <Link href={`/admin/contests/${params.contestId}/settlement`} className="contest-inline-note">Settlement workbench</Link>
            <Link href={`/admin/contests/${params.contestId}/audit`} className="contest-inline-note">Contest audit timeline</Link>
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
  detail,
  expandable,
  expanded,
  onToggle,
}: {
  label: string;
  ok: boolean;
  detail: string;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <span style={{ fontSize: "1rem", color: ok ? "#27ae60" : "#c0392b", minWidth: "1.2rem" }}>{ok ? "✓" : "✗"}</span>
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
