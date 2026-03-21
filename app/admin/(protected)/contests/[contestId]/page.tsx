"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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


type TokenScoreDetail = {
  id: string;
  tokenProject: { displayName: string; slug: string };
  priceChange: number | null;
  marketCapChange: number | null;
  volumeChange: number | null;
  rankChange: number | null;
  baseScore: number;
  momentumMultiplier: number;
  finalScore: number;
};

type ScoringBreakdownDetail = {
  id: string;
  baseScore: number;
  rarityMultiplier: number;
  editionMultiplier: number;
  finalScore: number;
  dataQuality: string;
  tokenProject: { displayName: string; slug: string };
  entry: { id: string; userId: string; user: { handle: string | null; displayName: string | null } };
  cardInstance: { id: string; cardTemplate: { name: string; imageUrl: string | null; rarity: { code: string } | null; edition: { code: string } | null } };
};

type ScoringDetailPayload = {
  ok: boolean;
  tokenScores: TokenScoreDetail[];
  breakdownRows: ScoringBreakdownDetail[];
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
  const [showScoringDetail, setShowScoringDetail] = useState(false);
  const [scoringDetailLoading, setScoringDetailLoading] = useState(false);
  const [scoringDetail, setScoringDetail] = useState<ScoringDetailPayload | null>(null);
  const [scoringDetailError, setScoringDetailError] = useState("");

  const loadSnapshots = async () => {
    setSnapshotsLoading(true);
    const response = await fetch(`/api/internal/contest-runs/${params.contestId}/snapshots`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as SnapshotPayload;
      setSnapshots(payload);
    }
    setSnapshotsLoading(false);
  };

  const loadOverview = async () => {
    const overviewRes = await fetch(`/api/internal/contest-runs/${params.contestId}/overview`, { cache: "no-store" });
    if (!overviewRes.ok) {
      const payload = (await overviewRes.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Cannot load contest overview");
    }
    const payload = (await overviewRes.json()) as OverviewPayload;
    setData(payload);
    return payload;
  };


  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        await Promise.all([loadOverview(), loadSnapshots()]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Cannot load contest overview");
      }
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

  const waitForFinalization = async () => {
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const overview = await loadOverview();
      if (overview.progress.settlementDone || (overview.progress.scoringReady && overview.progress.rankingGenerated)) {
        return overview;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }
    throw new Error("Finalization is still running. Refresh in a few seconds to see final status.");
  };

  const loadScoringDetail = async () => {
    setScoringDetailLoading(true);
    setScoringDetailError("");
    try {
      const response = await fetch(`/api/internal/contest-runs/${params.contestId}/scoring/detail`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ScoringDetailPayload & { error?: string };
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "Cannot load scoring details");
      }
      setScoringDetail(payload);
    } catch (detailError) {
      setScoringDetailError(detailError instanceof Error ? detailError.message : "Cannot load scoring details");
    }
    setScoringDetailLoading(false);
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
      if (phase === "END") {
        setMessage("END snapshot captured. Finalization pipeline running…");
        await waitForFinalization();
        setMessage("Contest finalization pipeline completed.");
      } else {
        setMessage(`${phase} snapshot captured — ${payload?.capturedCount ?? 0}/${payload?.tokenCount ?? 0} tokens captured, ${payload?.missingCount ?? 0} missing.`);
        await loadOverview();
      }
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
      await loadOverview();
    }
    setBusyRebuildRankings(false);
  };

  return (
    <div className="admin-v2-page contest-admin-overview-page">
      <section className="contest-admin-overview-back">
        <Link href="/admin/contests" className="admin-v2-link-chip">← Back to contest catalog</Link>
      </section>

      {loading ? <section className="admin-v2-panel"><p className="contest-admin-muted">Loading overview…</p></section> : null}
      {message ? <section className="admin-v2-panel"><p className="contest-admin-muted">{message}</p></section> : null}
      {error ? <section className="admin-v2-panel"><p className="contest-error">{error}</p></section> : null}

      {data ? (
        <>
          <section className="admin-v2-panel contest-admin-hero">
            <div>
              <p className="contest-admin-code">{data.contest.code}</p>
              <h1 className="contest-admin-title">{data.contest.title}</h1>
            </div>
            <div className="contest-admin-hero-actions">
              <span className={`contest-admin-status is-${data.contest.status.toLowerCase()}`}>{data.contest.status}</span>
              {(data.contest.status === "OPEN" || data.contest.status === "LOCKED" || data.contest.status === "LIVE") ? (
                <Button variant="ghost" onClick={() => void stopContest()} disabled={busyStop} className="contest-admin-stop-btn">
                  {busyStop ? "Stopping…" : "Stop contest"}
                </Button>
              ) : null}
            </div>
          </section>

          <section className="admin-v2-panel">
            <h2 className="contest-admin-section-title">Status summary</h2>
            <div className="contest-admin-summary-grid">
              <Meta label="Entries" value={String(data.contest._count.entries)} />
              <Meta label="Rankings" value={String(data.contest._count.rankings)} />
              <Meta label="Scores" value={String(data.contest._count.scores)} />
              <Meta label="Settlements" value={String(data.contest._count.settlements)} />
              <Meta label="Lock time" value={formatDate(data.contest.lockAt)} />
              <Meta label="End time" value={formatDate(data.contest.endsAt)} />
              <Meta label="Scoring readiness" value={data.progress.scoringReady ? "Ready" : "Blocked"} />
              <Meta label="Settlement status" value={data.progress.settlementDone ? "Done" : "Pending"} />
            </div>
          </section>

          <section className="admin-v2-panel">
            <h2 className="contest-admin-section-title">Pipeline status</h2>

            {snapshotsLoading ? (
              <p className="contest-admin-muted">Loading snapshot data…</p>
            ) : snapshots ? (
              <>
                <div className="contest-admin-pipeline-list">
                  <PipelineRow
                    label="START snapshot"
                    ok={snapshots.hasStartSnapshot && snapshots.start.capturedWithPrice > 0}
                    warn={snapshots.hasStartSnapshot && snapshots.start.capturedWithPrice === 0}
                    status={snapshots.hasStartSnapshot ? "OK" : "Missing"}
                    detail={`${snapshots.start.capturedWithPrice}/${snapshots.start.tokenCount} tokens with price`}
                    subDetail={snapshots.start.capturedAt ? `Captured ${formatDate(snapshots.start.capturedAt)}` : "Capture expected on LIVE transition"}
                    expandable={snapshots.start.tokens.length > 0}
                    expanded={showStartDetail}
                    onToggle={() => setShowStartDetail((v) => !v)}
                  />

                  <PipelineRow
                    label="END snapshot"
                    ok={snapshots.hasEndSnapshot && snapshots.end.capturedWithPrice > 0}
                    warn={snapshots.hasEndSnapshot && snapshots.end.capturedWithPrice === 0}
                    status={snapshots.hasEndSnapshot ? "OK" : "Pending"}
                    detail={`${snapshots.end.capturedWithPrice}/${snapshots.end.tokenCount} tokens with price`}
                    subDetail={snapshots.end.capturedAt ? `Captured ${formatDate(snapshots.end.capturedAt)}` : "Not captured yet"}
                    expandable={snapshots.end.tokens.length > 0}
                    expanded={showEndDetail}
                    onToggle={() => setShowEndDetail((v) => !v)}
                  />

                  <PipelineRow
                    label="Scoring"
                    ok={data.progress.scoringReady}
                    status={data.progress.scoringReady ? "OK" : "Pending"}
                    detail={data.progress.scoringReady ? "Calculated" : "Awaiting valid snapshots"}
                    expandable={data.progress.scoringReady}
                    expanded={showScoringDetail}
                    onToggle={() => {
                      setShowScoringDetail((v) => {
                        const next = !v;
                        if (next && !scoringDetail && !scoringDetailLoading) void loadScoringDetail();
                        return next;
                      });
                    }}
                  />
                  <PipelineRow label="Ranking" ok={data.progress.rankingGenerated} status={data.progress.rankingGenerated ? "OK" : "Pending"} detail={data.progress.rankingGenerated ? "Generated" : "Awaiting scoring run"} />
                  <PipelineRow label="Settlement" ok={data.progress.settlementDone} status={data.progress.settlementDone ? "OK" : "Pending"} detail={data.progress.settlementDone ? "Completed" : "Awaiting finalization"} />
                </div>

                {snapshots.hasStartSnapshot && snapshots.start.capturedWithPrice < snapshots.start.tokenCount && snapshots.start.tokenCount > 0 ? (
                  <div className="contest-admin-warning-inline">{snapshots.start.tokenCount - snapshots.start.capturedWithPrice} START token(s) have no price data.</div>
                ) : null}
                {snapshots.hasEndSnapshot && snapshots.end.capturedWithPrice < snapshots.end.tokenCount && snapshots.end.tokenCount > 0 ? (
                  <div className="contest-admin-warning-inline">{snapshots.end.tokenCount - snapshots.end.capturedWithPrice} END token(s) have no price data.</div>
                ) : null}

                {showStartDetail && snapshots.start.tokens.length > 0 ? (
                  <SnapshotTable phase="START" tokens={snapshots.start.tokens} />
                ) : null}

                {showEndDetail && snapshots.end.tokens.length > 0 ? (
                  <SnapshotTable phase="END" tokens={snapshots.end.tokens} />
                ) : null}

                {showScoringDetail ? (
                  <ScoringDetailPanel payload={scoringDetail} loading={scoringDetailLoading} error={scoringDetailError} />
                ) : null}

                <div className="contest-admin-pipeline-actions">
                  {data.contest.status === "LIVE" && !snapshots.hasStartSnapshot ? (
                    <Button variant="ghost" onClick={() => void captureSnapshot("START")} disabled={busyCapture !== null}>
                      {busyCapture === "START" ? "Capturing…" : "Capture START snapshot"}
                    </Button>
                  ) : null}

                  {data.contest.status === "LIVE" && snapshots.hasStartSnapshot && snapshots.start.capturedWithPrice === 0 ? (
                    <Button variant="ghost" onClick={() => void captureSnapshot("START", true)} disabled={busyCapture !== null} className="contest-admin-danger-btn">
                      {busyCapture === "START" ? "Capturing…" : "Re-capture START snapshot"}
                    </Button>
                  ) : null}

                  {data.contest.status === "LIVE" && snapshots.hasStartSnapshot && !snapshots.hasEndSnapshot ? (
                    <Button variant="ghost" onClick={() => void captureSnapshot("END")} disabled={busyCapture !== null}>
                      {busyCapture === "END" ? "Capturing…" : "Capture END snapshot"}
                    </Button>
                  ) : null}

                  {data.contest._count.scores > 0 && !data.progress.rankingGenerated ? (
                    <Button variant="ghost" onClick={() => void rebuildRankings()} disabled={busyRebuildRankings} className="contest-admin-warning-btn">
                      {busyRebuildRankings ? "Rebuilding…" : "Rebuild rankings"}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="contest-error">Could not load snapshot data.</p>
            )}
          </section>

          <section className="admin-v2-panel">
            <h2 className="contest-admin-section-title">Blocking issues</h2>
            {data.blockers.length > 0 ? (
              <div className="contest-admin-blocker-list">
                {data.blockers.map((item) => (
                  <div key={item} className="contest-admin-blocker-item">
                    <span aria-hidden>⚠</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="contest-admin-muted">No blockers currently detected.</p>
            )}
            <p className="contest-admin-muted">Allowed next transitions: {data.allowedTransitions.length > 0 ? data.allowedTransitions.join(", ") : "none"}</p>
          </section>

          <section className="admin-v2-panel">
            <h2 className="contest-admin-section-title">Milestones</h2>
            <div className="contest-admin-milestones-grid">
              <Meta label="Goes live" value={formatDate(data.contest.liveAt)} />
              <Meta label="Lock" value={formatDate(data.contest.lockAt)} />
              <Meta label="End" value={formatDate(data.contest.endsAt)} />
            </div>
          </section>

          <section className="admin-v2-panel contest-admin-footer-actions">
            {(data.contest.status === "OPEN" || data.contest.status === "LOCKED" || data.contest.status === "LIVE") ? (
              <Button onClick={() => void stopContest()} disabled={busyStop} className="contest-admin-stop-btn">
                {busyStop ? "Stopping…" : "Stop contest"}
              </Button>
            ) : null}
            <Link href={`/admin/contests/${params.contestId}/lifecycle`} className="admin-v2-link-chip">Manage lifecycle</Link>
            <Link href={`/admin/contests/${params.contestId}/scoring`} className="admin-v2-link-chip">Scoring &amp; Settlement</Link>
            <Link href={`/admin/contests/${params.contestId}/settlement`} className="admin-v2-link-chip">Settlement workbench</Link>
            <Link href={`/admin/contests/${params.contestId}/operator`} className="admin-v2-link-chip">Operator console</Link>
            <Link href={`/admin/contests/${params.contestId}/audit`} className="admin-v2-link-chip">Audit log</Link>
            {(data.contest.status === "CANCELED" || (data.contest._count.entries === 0 && data.contest._count.scores === 0 && data.contest._count.rankings === 0 && data.contest._count.settlements === 0)) ? (
              <Button variant="ghost" onClick={() => void deleteContest()} disabled={busyDelete} className="contest-admin-danger-btn">Delete contest</Button>
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
  status,
  detail,
  subDetail,
  expandable,
  expanded,
  onToggle,
}: {
  label: string;
  ok: boolean;
  warn?: boolean;
  status: string;
  detail: string;
  subDetail?: string;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const icon = ok ? "✓" : warn ? "⚠" : "✗";
  const toneClass = ok ? "ok" : warn ? "warn" : "danger";
  return (
    <div className="contest-admin-pipeline-row">
      <span className={`contest-admin-pipeline-icon ${toneClass}`} aria-hidden>{icon}</span>
      <div className="contest-admin-pipeline-main">
        <div className="contest-admin-pipeline-head">
          <span className="contest-admin-pipeline-label">{label}</span>
          <span className={`contest-admin-pipeline-state ${toneClass}`}>{status}</span>
        </div>
        <p className="contest-admin-muted">{detail}</p>
        {subDetail ? <p className="contest-admin-subtle">{subDetail}</p> : null}
      </div>
      {expandable && onToggle ? <button onClick={onToggle} className="contest-admin-inline-action">{expanded ? "Hide details" : "Show details"}</button> : null}
    </div>
  );
}

function SnapshotTable({ phase, tokens }: { phase: "START" | "END"; tokens: SnapshotToken[] }) {
  return (
    <div className="contest-admin-data-table-wrap">
      <p className="contest-admin-subtle">{phase} snapshot detail ({tokens.length} tokens)</p>
      <table className="contest-admin-data-table">
        <thead>
          <tr>
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
            <tr key={token.geckoId}>
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


function ScoringDetailPanel({ payload, loading, error }: { payload: ScoringDetailPayload | null; loading: boolean; error: string }) {
  if (loading) return <p className="contest-admin-muted">Loading scoring details…</p>;
  if (error) return <p className="contest-error">{error}</p>;
  if (!payload) return null;

  const groupedRows = payload.breakdownRows.reduce<Record<string, { label: string; rows: ScoringBreakdownDetail[] }>>((acc, row) => {
    const label = row.entry.user.displayName || row.entry.user.handle || row.entry.userId;
    if (!acc[row.entry.userId]) {
      acc[row.entry.userId] = { label, rows: [] };
    }
    acc[row.entry.userId].rows.push(row);
    return acc;
  }, {});

  return (
    <div className="contest-admin-score-panel">
      <div className="contest-admin-data-table-wrap">
        <p className="contest-admin-subtle">Token scores ({payload.tokenScores.length})</p>
        <table className="contest-admin-data-table">
          <thead>
            <tr>
              <Th>Token</Th>
              <Th>Weighted component score</Th>
              <Th>Momentum bonus</Th>
              <Th>Token score</Th>
              <Th>Price Δ</Th>
              <Th>MC Δ</Th>
              <Th>Vol Δ</Th>
            </tr>
          </thead>
          <tbody>
            {payload.tokenScores.map((row) => (
              <tr key={row.id}>
                <Td>{row.tokenProject.displayName || row.tokenProject.slug}</Td>
                <Td>{row.baseScore.toFixed(2)}</Td>
                <Td>×{row.momentumMultiplier.toFixed(3)}</Td>
                <Td><strong>{row.finalScore.toFixed(2)}</strong></Td>
                <Td>{formatPercent(row.priceChange)}</Td>
                <Td>{formatPercent(row.marketCapChange)}</Td>
                <Td>{formatPercent(row.volumeChange)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="contest-admin-breakdown-grid">
        <p className="contest-admin-subtle">Entry breakdowns ({payload.breakdownRows.length})</p>
        {Object.entries(groupedRows).map(([userId, group]) => (
          <div key={userId} className="contest-admin-breakdown-card">
            <p className="contest-admin-subtle">{group.label}</p>
            {group.rows.map((row) => (
              <div key={row.id} className="contest-admin-breakdown-row">
                <span>
                  {row.cardInstance.cardTemplate.name} · {row.tokenProject.displayName} ({row.cardInstance.cardTemplate.rarity?.code ?? "-"}/{row.cardInstance.cardTemplate.edition?.code ?? "-"})
                </span>
                <span>
                  {row.baseScore.toFixed(2)} × {row.rarityMultiplier.toFixed(2)} × {row.editionMultiplier.toFixed(2)} = <strong>{row.finalScore.toFixed(2)}</strong>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th>{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td>{children}</td>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="contest-admin-meta-item">
      <p className="contest-admin-meta-label">{label}</p>
      <p className="contest-admin-meta-value">{value}</p>
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

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function formatMillions(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}
