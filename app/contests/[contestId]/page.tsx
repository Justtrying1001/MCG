"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { CardSelectorModal } from "@/components/contests/CardSelectorModal";
import { RulesDrawer } from "@/components/contests/RulesDrawer";
import { useSession } from "@/components/useSession";
import type { ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";

type ContestDetail = {
  contest: {
    id: string;
    title: string;
    code: string;
    status: ContestStatus;
    lockAt: string | null;
    endsAt: string | null;
    rules: ContestRule[];
    _count: { entries: number };
  };
  userEntry: {
    id: string;
    rosterLocks: Array<{ ownedCardInstanceId: string }>;
  } | null;
};

type RankingPayload = {
  rankings: Array<{ id: string; userId: string; rank: number; score: number; user: { displayName: string } }>;
};

function fmtCountdown(targetMs: number | null, nowMs: number): string {
  if (targetMs === null) return "--:--:--";
  const diff = Math.max(0, targetMs - nowMs);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const loadAll = useCallback(async () => {
    const [detailRes, rankingRes, optionsRes] = await Promise.all([
      fetch(`/api/contests/${params.contestId}`, { cache: "no-store" }),
      fetch(`/api/contests/${params.contestId}/ranking`, { cache: "no-store" }),
      fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" }),
    ]);

    if (detailRes.ok) {
      const payload = (await detailRes.json()) as ContestDetail;
      setDetail(payload);
      const roster = payload.userEntry?.rosterLocks?.map((row) => row.ownedCardInstanceId) ?? [];
      setSelected(roster);
    } else {
      setDetail(null);
      setError("Unable to load contest details.");
    }

    if (rankingRes.ok) setRanking((await rankingRes.json()) as RankingPayload);
    if (optionsRes.ok) {
      const payload = (await optionsRes.json().catch(() => null)) as { options?: LineupOption[] } | null;
      setOptions(Array.isArray(payload?.options) ? payload.options : []);
    }
  }, [params.contestId]);

  useEffect(() => {
    if (loading || !me) return;
    setError("");
    void loadAll();
  }, [loading, me, loadAll]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const contest = detail?.contest;
  const rule = contest?.rules[0];
  const rosterSize = rule?.maxRosterSize ?? 5;
  const selectedCards = useMemo(
    () => selected.map((id) => options.find((item) => item.instanceId === id)).filter(Boolean) as LineupOption[],
    [selected, options],
  );

  const canManageLineup = contest?.status === "OPEN";
  const canSubmit = Boolean(canManageLineup && selected.length === rosterSize && !detail?.userEntry);

  const countdownTarget = useMemo(() => {
    if (!contest) return null;
    if (contest.status === "OPEN" && contest.lockAt) return new Date(contest.lockAt).getTime();
    if ((contest.status === "LOCKED" || contest.status === "LIVE") && contest.endsAt) return new Date(contest.endsAt).getTime();
    return null;
  }, [contest]);

  const submitEntry = async () => {
    if (!canSubmit) return;
    setSubmitBusy(true);
    setError("");
    const res = await fetch(`/api/contests/${params.contestId}/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineupInstanceIds: selected }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Contest entry failed");
      setSubmitBusy(false);
      return;
    }
    await loadAll();
    setSubmitBusy(false);
  };

  if (!me && !loading) {
    return (
      <SiteShell>
        <p className="mcg-eyebrow">Connect with X to access contest details.</p>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="mcg-surface" style={{ display: "grid", gap: "0.75rem" }}>
        <h1>{contest?.title ?? "Contest"}</h1>
        <p className="mcg-eyebrow">Code: {contest?.code ?? "—"}</p>
        <p className="mcg-eyebrow">Participants: {contest?._count.entries ?? 0}</p>
        <p className="mcg-eyebrow">Countdown: {fmtCountdown(countdownTarget, nowTs)}</p>
      </section>

      {error ? <section className="mcg-surface">{error}</section> : null}

      <section className="mcg-surface" style={{ display: "grid", gap: "0.75rem" }}>
        <h2>Your lineup</h2>
        <p>{selected.length}/{rosterSize} cards selected</p>
        <ul>
          {selectedCards.map((card) => (
            <li key={card.instanceId}>{card.name} · {card.rarityCode}</li>
          ))}
        </ul>
        {canManageLineup ? <button className="mcg-btn" onClick={() => setShowModal(true)}>Build lineup</button> : null}
        {canSubmit ? (
          <button className="mcg-btn" disabled={submitBusy} onClick={() => void submitEntry()}>
            {submitBusy ? "Saving…" : "Submit entry"}
          </button>
        ) : null}
      </section>

      <section className="mcg-surface" style={{ display: "grid", gap: "0.75rem" }}>
        <h2>Leaderboard</h2>
        <ol>
          {(ranking?.rankings ?? []).slice(0, 10).map((row) => (
            <li key={row.id}>#{row.rank} · {row.user.displayName} · {row.score.toFixed(2)}</li>
          ))}
        </ol>
      </section>

      <CardSelectorModal
        open={showModal}
        onClose={() => setShowModal(false)}
        options={options}
        selectedIds={selected}
        canEnter={Boolean(canManageLineup)}
        onToggle={(instanceId) => {
          setSelected((prev) => {
            if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
            if (prev.length >= rosterSize) return prev;
            return [...prev, instanceId];
          });
        }}
      />

      <RulesDrawer
        open={false}
        onClose={() => undefined}
        rosterSize={rosterSize}
        restrictedSet={Boolean(rule?.cardSetId)}
        status={contest?.status ?? "OPEN"}
      />
    </SiteShell>
  );
}
