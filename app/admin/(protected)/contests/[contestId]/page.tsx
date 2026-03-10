"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";

type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
type RewardType = "POINTS" | "PACK" | "CARD_INSTANCE";

type ContestRule = {
  id: string;
  cardSetId: string | null;
  maxRosterSize: number | null;
  config: unknown;
};

type ContestDetailPayload = {
  contest: {
    id: string;
    code: string;
    title: string;
    status: ContestStatus;
    startsAt: string | null;
    lockAt: string | null;
    endsAt: string | null;
    rules: ContestRule[];
    _count: {
      entries: number;
      scores: number;
      rankings: number;
      settlements: number;
    };
  };
  rankings: Array<{ id: string; userId: string; rank: number; score: number }>;
  recentScores: Array<{ id: string; userId: string; score: number; scoredAt: string }>;
};

type RewardRow = {
  userId: string;
  type: RewardType;
  amount: string;
  packDefinitionId: string;
};

const STATUS_OPTIONS: ContestStatus[] = ["DRAFT", "OPEN", "LOCKED", "LIVE", "SETTLED", "CANCELED"];
const REWARD_TYPE_OPTIONS: RewardType[] = ["POINTS", "PACK", "CARD_INSTANCE"];

export default function AdminContestDetailPage({ params }: { params: { contestId: string } }) {
  const [detail, setDetail] = useState<ContestDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusDraft, setStatusDraft] = useState<ContestStatus>("DRAFT");
  const [statusMessage, setStatusMessage] = useState("");

  const [scoresText, setScoresText] = useState('[{"userId":"","score":0}]');
  const [scoreMessage, setScoreMessage] = useState("");

  const [rewards, setRewards] = useState<RewardRow[]>([{ userId: "", type: "POINTS", amount: "", packDefinitionId: "" }]);
  const [settleMessage, setSettleMessage] = useState("");

  const loadDetail = async () => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/internal/contests/${params.contestId}`, { cache: "no-store" });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot load contest detail");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as ContestDetailPayload;
    setDetail(payload);
    setStatusDraft(payload.contest.status);
    setLoading(false);
  };

  useEffect(() => {
    void loadDetail();
  }, [params.contestId]);

  const rule = useMemo(() => detail?.contest.rules?.[0] ?? null, [detail]);

  const updateStatus = async () => {
    setStatusMessage("");
    const response = await fetch(`/api/internal/contests/${params.contestId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusDraft }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatusMessage(payload?.error ?? "Status update failed");
      return;
    }

    setStatusMessage("Status updated.");
    await loadDetail();
  };

  const submitScores = async () => {
    setScoreMessage("");

    let parsed: Array<{ userId: string; score: number }>;
    try {
      parsed = JSON.parse(scoresText) as Array<{ userId: string; score: number }>;
    } catch {
      setScoreMessage("Scores JSON is invalid");
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setScoreMessage("Provide a non-empty scores array");
      return;
    }

    const response = await fetch(`/api/internal/contests/${params.contestId}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: parsed }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setScoreMessage(payload?.error ?? "Score submission failed");
      return;
    }

    const payload = (await response.json()) as { rankingsCount: number };
    setScoreMessage(`Scores submitted. Rankings count: ${payload.rankingsCount}.`);
    await loadDetail();
  };

  const updateRewardRow = (index: number, field: keyof RewardRow, value: string) => {
    setRewards((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };

  const addRewardRow = () => {
    setRewards((prev) => [...prev, { userId: "", type: "POINTS", amount: "", packDefinitionId: "" }]);
  };

  const removeRewardRow = (index: number) => {
    setRewards((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const settleContest = async () => {
    setSettleMessage("");

    const normalized = rewards
      .filter((reward) => reward.userId.trim())
      .map((reward) => ({
        userId: reward.userId.trim(),
        type: reward.type,
        amount: reward.amount.trim() ? Number(reward.amount) : undefined,
        packDefinitionId: reward.packDefinitionId.trim() || undefined,
      }));

    if (normalized.some((reward) => Number.isNaN(reward.amount))) {
      setSettleMessage("Reward amount must be numeric when provided");
      return;
    }

    const response = await fetch(`/api/internal/contests/${params.contestId}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewards: normalized }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setSettleMessage(payload?.error ?? "Settlement failed");
      return;
    }

    const payload = (await response.json()) as { settlementId: string; rewardCount: number };
    setSettleMessage(`Settlement completed. settlementId=${payload.settlementId}, rewards=${payload.rewardCount}.`);
    await loadDetail();
  };

  return (
    <SiteShell>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Contest Operations</h1>
          <p className="page-subtitle">Internal management for contest lifecycle, scoring, and settlement.</p>
        </div>
        <AdminLogoutButton />
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        <section className="contest-section">
          <Link href="/admin/contests" className="contest-inline-note">← Back to contests admin</Link>
        </section>

        {loading ? <section className="contest-section"><p className="contest-inline-note">Loading contest…</p></section> : null}
        {error ? <section className="contest-section"><p className="contest-error">{error}</p></section> : null}

        {detail ? (
          <>
            <section className="contest-section">
              <div className="contest-card-top">
                <p className="contest-code">{detail.contest.code}</p>
                <span className={`contest-status status-${detail.contest.status.toLowerCase()}`}>{detail.contest.status}</span>
              </div>
              <h2 className="contest-title">{detail.contest.title}</h2>
              <div className="contest-meta-grid">
                <ContestMeta label="Entries" value={String(detail.contest._count.entries)} />
                <ContestMeta label="Scores" value={String(detail.contest._count.scores)} />
                <ContestMeta label="Rankings" value={String(detail.contest._count.rankings)} />
                <ContestMeta label="Settlements" value={String(detail.contest._count.settlements)} />
                <ContestMeta label="Starts" value={formatDate(detail.contest.startsAt)} />
                <ContestMeta label="Lock" value={formatDate(detail.contest.lockAt)} />
                <ContestMeta label="Ends" value={formatDate(detail.contest.endsAt)} />
                <ContestMeta label="Roster size" value={String(rule?.maxRosterSize ?? 5)} />
              </div>
              <p className="contest-inline-note">Rule cardSetId: {rule?.cardSetId ?? "none"}</p>
            </section>

            <section className="contest-section" style={{ display: "grid", gap: "0.6rem" }}>
              <h3 className="contest-section-title">Status management</h3>
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                <select className="input" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as ContestStatus)}>
                  {STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>{statusOption}</option>
                  ))}
                </select>
                <Button onClick={() => void updateStatus()}>Update status</Button>
                {statusMessage ? <span className="contest-inline-note">{statusMessage}</span> : null}
              </div>
            </section>

            <section className="contest-section" style={{ display: "grid", gap: "0.6rem" }}>
              <h3 className="contest-section-title">Score injection</h3>
              <p className="contest-inline-note">Paste JSON array of score rows.</p>
              <textarea className="input" rows={8} value={scoresText} onChange={(event) => setScoresText(event.target.value)} />
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                <Button onClick={() => void submitScores()}>Submit scores</Button>
                {scoreMessage ? <span className="contest-inline-note">{scoreMessage}</span> : null}
              </div>
            </section>

            <section className="contest-section" style={{ display: "grid", gap: "0.6rem" }}>
              <h3 className="contest-section-title">Settlement</h3>
              {rewards.map((reward, index) => (
                <div key={index} style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  <input className="input" placeholder="userId" value={reward.userId} onChange={(event) => updateRewardRow(index, "userId", event.target.value)} />
                  <select className="input" value={reward.type} onChange={(event) => updateRewardRow(index, "type", event.target.value)}>
                    {REWARD_TYPE_OPTIONS.map((typeOption) => (
                      <option key={typeOption} value={typeOption}>{typeOption}</option>
                    ))}
                  </select>
                  <input className="input" placeholder="amount (POINTS)" value={reward.amount} onChange={(event) => updateRewardRow(index, "amount", event.target.value)} />
                  <input className="input" placeholder="packDefinitionId (PACK)" value={reward.packDefinitionId} onChange={(event) => updateRewardRow(index, "packDefinitionId", event.target.value)} />
                  <Button variant="ghost" onClick={() => removeRewardRow(index)}>Remove</Button>
                </div>
              ))}
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="ghost" onClick={addRewardRow}>Add reward row</Button>
                <Button onClick={() => void settleContest()}>Settle contest</Button>
                {settleMessage ? <span className="contest-inline-note">{settleMessage}</span> : null}
              </div>
            </section>

            <section className="contest-section">
              <h3 className="contest-section-title">Ranking snapshot</h3>
              {detail.rankings.length ? (
                <div className="contest-ranking-table">
                  {detail.rankings.map((row) => (
                    <div className="contest-ranking-row" key={row.id}>
                      <span>#{row.rank}</span>
                      <span>{row.userId.slice(0, 10)}…</span>
                      <span>{row.score.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="contest-inline-note">No ranking rows yet.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </SiteShell>
  );
}

function ContestMeta({ label, value }: { label: string; value: string }) {
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
