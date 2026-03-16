"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/components/admin/AdminUi";
import { ScoreBreakdownTable } from "@/components/admin/ScoreBreakdownTable";

type ConsolePayload = {
  contest: { id: string; title: string; code: string; status: string };
  players: Array<{ userId: string; displayName: string | null; username: string | null; ranking: number | null; finalScore: number | null; lineup: Array<{ card: { name: string; tokenProjectName: string; rarity: string; edition: string } }> }>;
  snapshots: {
    START: Array<{ tokenProject: { displayName: string }; priceUsd: string | null; volume24hUsd: string | null }>;
    END: Array<{ tokenProject: { displayName: string }; priceUsd: string | null; volume24hUsd: string | null }>;
  };
  scoring: {
    tokenScores: Array<{ id: string; tokenProject: { displayName: string }; score: number; priceChange: number | null; marketCapChange: number | null; volumeChange: number | null }>;
    breakdownRows: Array<{ id: string; entry: { id: string; userId: string; user?: { displayName: string | null; xUsername: string | null } }; tokenProject: { displayName: string; slug: string }; cardInstance: { cardTemplate: { name: string; rarity?: { code: string } | null; edition?: { code: string } | null } }; finalScore: number; rarityMultiplier: number; editionMultiplier: number; baseScore: number }>;
  };
};

function safeNumber(input: string | null) {
  const parsed = input ? Number(input) : null;
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ContestOperatorPage({ params }: { params: { contestId: string } }) {
  const [payload, setPayload] = useState<ConsolePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/internal/contest-runs/${params.contestId}/console`, { cache: "no-store" });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(json?.error ?? "Cannot load operator console");
        setLoading(false);
        return;
      }
      setPayload((await res.json()) as ConsolePayload);
      setLoading(false);
    })();
  }, [params.contestId]);

  const snapshotRows = useMemo(() => {
    const startByToken = new Map(payload?.snapshots.START.map((row) => [row.tokenProject.displayName, row]));
    const endByToken = new Map(payload?.snapshots.END.map((row) => [row.tokenProject.displayName, row]));
    const keys = new Set<string>([...startByToken.keys(), ...endByToken.keys()]);
    return [...keys].map((token) => {
      const start = startByToken.get(token);
      const end = endByToken.get(token);
      const startPrice = safeNumber(start?.priceUsd ?? null);
      const endPrice = safeNumber(end?.priceUsd ?? null);
      const delta = startPrice && endPrice ? ((endPrice - startPrice) / startPrice) * 100 : null;
      return { token, startPrice, endPrice, delta };
    });
  }, [payload]);

  return (
    <div className="admin-v2-page contest-console-page">
      <AdminPageHeader
        title="Contest Operator Console"
        subtitle="Inspect snapshots, token performance, and user score breakdowns in one place."
        actions={payload ? <AdminStatusBadge tone="neutral" label={`${payload.contest.code} · ${payload.contest.status}`} /> : null}
      />

      {loading ? <AdminPanel><AdminEmptyState title="Loading operator console…" /></AdminPanel> : null}
      {error ? <AdminPanel><p className="contest-error">{error}</p></AdminPanel> : null}

      {!loading && payload ? (
        <>
          <AdminPanel>
            <h3>Snapshots</h3>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Token</th><th>Price START</th><th>Price END</th><th>Delta %</th></tr></thead>
                <tbody>
                  {snapshotRows.map((row) => (
                    <tr key={row.token}>
                      <td>{row.token}</td>
                      <td>{row.startPrice?.toFixed(4) ?? "—"}</td>
                      <td>{row.endPrice?.toFixed(4) ?? "—"}</td>
                      <td>{typeof row.delta === "number" ? `${row.delta.toFixed(2)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminPanel>

          <AdminPanel>
            <h3>Token performance</h3>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Token</th><th>Score</th><th>Price</th><th>Volume</th><th>Marketcap</th></tr></thead>
                <tbody>
                  {payload.scoring.tokenScores.map((row) => (
                    <tr key={row.id}>
                      <td>{row.tokenProject.displayName}</td>
                      <td>{row.score.toFixed(2)}</td>
                      <td>{typeof row.priceChange === "number" ? `${(row.priceChange * 100).toFixed(2)}%` : "—"}</td>
                      <td>{typeof row.volumeChange === "number" ? `${(row.volumeChange * 100).toFixed(2)}%` : "—"}</td>
                      <td>{typeof row.marketCapChange === "number" ? `${(row.marketCapChange * 100).toFixed(2)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminPanel>

          <AdminPanel>
            <h3>Score Breakdown</h3>
            <p style={{ margin: "0 0 0.75rem", color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
              Formula: <code>finalScore = baseScore × rarityMultiplier × editionMultiplier</code>
            </p>
            <ScoreBreakdownTable breakdownRows={payload.scoring.breakdownRows} />
          </AdminPanel>

          <AdminPanel>
            <h3>User breakdown</h3>
            <div className="contest-operator-users">
              {payload.players.map((player) => (
                <details key={player.userId} className="contest-operator-user-item">
                  <summary>
                    <span>{player.displayName?.trim() || player.username || "Player"}</span>
                    <span>{player.ranking ? `#${player.ranking}` : "—"}</span>
                    <strong>{typeof player.finalScore === "number" ? player.finalScore.toFixed(2) : "—"}</strong>
                    <span>{player.lineup.length} cards</span>
                  </summary>
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead><tr><th>Card</th><th>Token</th><th>Rarity</th><th>Edition</th></tr></thead>
                      <tbody>
                        {player.lineup.map((row, idx) => (
                          <tr key={`${player.userId}-${idx}`}>
                            <td>{row.card.name}</td>
                            <td>{row.card.tokenProjectName}</td>
                            <td>{row.card.rarity}</td>
                            <td>{row.card.edition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          </AdminPanel>
        </>
      ) : null}
    </div>
  );
}
