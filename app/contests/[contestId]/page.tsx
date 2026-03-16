"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { LineupBuilderModal } from "@/components/contests/LineupBuilderModal";
import { LineupCardTile } from "@/components/contests/LineupCardTile";
import type { ContestEntryStatus, ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";

type ContestDetail = {
  contest: {
    id: string;
    title: string;
    code: string;
    status: ContestStatus;
    lockAt: string | null;
    liveAt: string | null;
    endsAt: string | null;
    rules: ContestRule[];
    seasonName?: string | null;
    leagueTierRequired?: string | null;
    _count: { entries: number };
  };
  userEntry: {
    id: string;
    status: ContestEntryStatus;
    rosterLocks: Array<{ ownedCardInstanceId: string }>;
  } | null;
};

type RankingPayload = {
  contest: { status: ContestStatus };
  rankings: Array<{ id: string; userId: string; rank: number; score: number; displayName: string }>;
};

type RewardPayload = {
  hasPolicyData: boolean;
  tiers: Array<{ label: string; bundleName: string; pointsAmount: number; xpAmount: number; packsCount: number }>;
};

type TabKey = "overview" | "entry" | "leaderboard" | "rewards" | "rules";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "entry", label: "My Entry" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "rewards", label: "Rewards" },
  { key: "rules", label: "Rules" },
];

function formatDate(value: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toSlots(roster: string[], rosterSize: number): Array<string | null> {
  const sanitized = roster.slice(0, rosterSize);
  while (sanitized.length < rosterSize) sanitized.push("");
  return sanitized.map((value) => value || null);
}

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [rewards, setRewards] = useState<RewardPayload | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [lineupSlots, setLineupSlots] = useState<Array<string | null>>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeBuilderSlot, setActiveBuilderSlot] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [error, setError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [builderFlash, setBuilderFlash] = useState("");

  const contest = detail?.contest;
  const rule = contest?.rules[0];
  const rosterSize = rule?.maxRosterSize ?? 5;

  const loadAll = useCallback(async () => {
    const [detailRes, rankingRes, optionsRes, rewardsRes] = await Promise.all([
      fetch(`/api/contests/${params.contestId}`, { cache: "no-store" }),
      fetch(`/api/contests/${params.contestId}/ranking`, { cache: "no-store" }),
      fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" }),
      fetch(`/api/contests/${params.contestId}/reward-preview`, { cache: "no-store" }),
    ]);

    if (detailRes.ok) {
      const payload = (await detailRes.json()) as ContestDetail;
      setDetail(payload);
      const nextRosterSize = payload.contest.rules?.[0]?.maxRosterSize ?? 5;
      const roster = payload.userEntry?.rosterLocks?.map((row) => row.ownedCardInstanceId) ?? [];
      setLineupSlots(toSlots(roster, nextRosterSize));
    } else {
      setError("Unable to load contest details.");
      setDetail(null);
    }

    if (rankingRes.ok) setRanking((await rankingRes.json()) as RankingPayload);
    if (rewardsRes.ok) setRewards((await rewardsRes.json()) as RewardPayload);
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
    if (!builderFlash) return;
    const id = window.setTimeout(() => setBuilderFlash(""), 2400);
    return () => window.clearTimeout(id);
  }, [builderFlash]);

  const entryFee = rule?.entryFeeEnabled ? `${rule.entryFeeAmount ?? 0} pts` : "Free";
  const canManageLineup = contest?.status === "OPEN";
  const hasEntry = Boolean(detail?.userEntry);

  const selectedIds = useMemo(() => lineupSlots.filter(Boolean) as string[], [lineupSlots]);
  const selectedCards = useMemo(() => {
    const optionById = new Map(options.map((item) => [item.instanceId, item]));
    return selectedIds.map((id) => optionById.get(id)).filter(Boolean) as LineupOption[];
  }, [selectedIds, options]);

  const userStatus = useMemo(() => {
    if (!contest) return "No team selected";
    if (!detail?.userEntry) return selectedIds.length > 0 ? "Team drafted" : "No team selected";
    if (contest.status === "OPEN") return "Team submitted";
    if (contest.status === "LOCKED") return "Team locked";
    if (contest.status === "LIVE") return "Contest live";
    return "Results available";
  }, [contest, detail?.userEntry, selectedIds.length]);

  const primaryCtaLabel = useMemo(() => {
    if (!contest) return "Build lineup";
    if (contest.status === "SETTLED") return "View results";
    if (contest.status === "LIVE") return "Track contest";
    if (hasEntry) return canManageLineup ? "Edit lineup" : "View my entry";
    return "Build lineup";
  }, [contest, hasEntry, canManageLineup]);

  const submitLineup = async () => {
    if (!contest || selectedIds.length !== rosterSize || contest.status !== "OPEN") return;
    setSubmitBusy(true);
    setError("");
    const res = await fetch(`/api/contests/${params.contestId}/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineupInstanceIds: selectedIds }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Contest entry failed");
      setSubmitBusy(false);
      return;
    }
    await loadAll();
    setSubmitBusy(false);
    setShowBuilder(false);
    setBuilderFlash("Lineup submitted successfully.");
    setActiveTab("entry");
  };

  const handleSelectCard = (instanceId: string, targetSlotIndex: number | null) => {
    if (!canManageLineup) return;
    setLineupSlots((prev) => {
      const next = [...(prev.length === rosterSize ? prev : toSlots(prev.filter(Boolean) as string[], rosterSize))];
      const existingIndex = next.findIndex((value) => value === instanceId);
      const targetIndex = targetSlotIndex ?? activeBuilderSlot;

      if (existingIndex >= 0 && existingIndex === targetIndex) {
        next[existingIndex] = null;
        return next;
      }

      if (existingIndex >= 0) {
        next[existingIndex] = null;
      }

      if (targetIndex >= 0 && targetIndex < rosterSize) {
        next[targetIndex] = instanceId;
        return next;
      }

      const emptyIndex = next.findIndex((value) => value === null);
      if (emptyIndex >= 0) {
        next[emptyIndex] = instanceId;
      }
      return next;
    });
  };

  const handleRemoveSlot = (slotIndex: number) => {
    if (!canManageLineup) return;
    setLineupSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
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
      <section className="contest-detail-hero">
        <div className="contest-detail-hero-main">
          <p className="contest-premium-code">{contest?.code ?? "—"}</p>
          <h1>{contest?.title ?? "Contest"}</h1>
          <p className="contest-inline-note">Leaderboard-centric contest with one lineup per player.</p>
          <div className="contest-detail-kpis">
            <span><b>Status</b>{contest?.status ?? "—"}</span>
            <span><b>Entry fee</b>{entryFee}</span>
            <span><b>Lineup size</b>{rosterSize} cards</span>
            <span><b>Registration</b>{canManageLineup ? "Open" : "Closed"}</span>
            <span><b>Lock</b>{formatDate(contest?.lockAt ?? null)}</span>
            <span><b>End</b>{formatDate(contest?.endsAt ?? null)}</span>
            <span><b>Reward teaser</b>{Math.max(120, rosterSize * 45)} pts</span>
            <span><b>Participants</b>{contest?._count.entries ?? 0}</span>
          </div>
        </div>
        <div className="contest-detail-user-status">
          <p className="mcg-eyebrow">Your status</p>
          <h3>{userStatus}</h3>
          <button
            type="button"
            className="mcg-btn"
            onClick={() => {
              if (!contest) return;
              if (contest.status === "OPEN") {
                setShowBuilder(true);
                setBuilderFlash("");
                return;
              }
              if (contest.status === "LIVE") {
                setActiveTab("leaderboard");
                return;
              }
              setActiveTab("entry");
            }}
            disabled={!contest}
          >
            {primaryCtaLabel}
          </button>
        </div>
      </section>

      {error ? <section className="mcg-surface">{error}</section> : null}

      <nav className="contest-detail-tabs" aria-label="Contest sections">
        {TABS.map((tab) => (
          <button key={tab.key} type="button" className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="contest-detail-panel">
          <h2>Contest summary</h2>
          <p className="contest-inline-note">Current phase: {contest?.status ?? "—"}. Build and submit before lock, then track rank live.</p>
          <div className="contest-overview-grid">
            <article className="mcg-surface"><h3>Timeline</h3><p>Lock: {formatDate(contest?.lockAt ?? null)}</p><p>Live: {formatDate(contest?.liveAt ?? null)}</p><p>End: {formatDate(contest?.endsAt ?? null)}</p></article>
            <article className="mcg-surface"><h3>Rewards</h3><p>Top positions receive progressive rewards tiers.</p><p>Preview available in Rewards tab.</p></article>
            <article className="mcg-surface"><h3>Participation</h3><p>{hasEntry ? "You already submitted a lineup." : "No lineup submitted yet."}</p></article>
          </div>
        </section>
      ) : null}

      {activeTab === "entry" ? (
        <section className="contest-detail-panel">
          <h2>My Entry</h2>
          {!hasEntry && selectedIds.length === 0 ? (
            <div className="mcg-surface">
              <h3>No team selected</h3>
              <p className="contest-inline-note">Build your lineup before lock to join this contest.</p>
              <button type="button" className="mcg-btn" onClick={() => setShowBuilder(true)} disabled={!canManageLineup}>Build lineup</button>
            </div>
          ) : (
            <>
              <p className="contest-inline-note">{selectedIds.length}/{rosterSize} cards selected.</p>
              <div className="contest-entry-preview-grid">
                {selectedCards.map((card) => <LineupCardTile key={card.instanceId} option={card} selected />)}
              </div>
              {canManageLineup ? <button type="button" className="mcg-btn" onClick={() => setShowBuilder(true)}>Edit lineup</button> : null}
            </>
          )}
        </section>
      ) : null}

      {activeTab === "leaderboard" ? (
        <section className="contest-detail-panel">
          <h2>Leaderboard</h2>
          {contest?.status === "OPEN" ? <p className="contest-inline-note">Contest not started yet.</p> : null}
          {(contest?.status === "LOCKED" || contest?.status === "LIVE") && (ranking?.rankings?.length ?? 0) === 0 ? <p className="contest-inline-note">Ranking pending.</p> : null}
          {(ranking?.rankings?.length ?? 0) > 0 ? (
            <ol className="contest-leaderboard-list">
              {ranking?.rankings.map((row) => (
                <li key={row.id} className={row.userId === me?.user.id ? "is-me" : ""}>
                  <span>#{row.rank}</span>
                  <span>{row.displayName}</span>
                  <b>{row.score.toFixed(2)}</b>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}

      {activeTab === "rewards" ? (
        <section className="contest-detail-panel">
          <h2>Rewards</h2>
          <p className="contest-inline-note">Entry fee: {entryFee}</p>
          <div className="contest-reward-tiers">
            {(rewards?.tiers ?? []).map((tier) => (
              <article key={`${tier.label}-${tier.bundleName}`} className="mcg-surface">
                <h3>{tier.label}</h3>
                <p>{tier.bundleName}</p>
                <p>{tier.pointsAmount} pts · {tier.xpAmount} XP · {tier.packsCount} packs</p>
              </article>
            ))}
            {(rewards?.tiers ?? []).length === 0 ? <p className="contest-inline-note">Rewards structure will be announced soon.</p> : null}
          </div>
        </section>
      ) : null}

      {activeTab === "rules" ? (
        <section className="contest-detail-panel">
          <h2>Rules</h2>
          <ul className="contest-rules-list">
            <li>One lineup per user for this leaderboard.</li>
            <li>Lineup must contain exactly {rosterSize} eligible cards.</li>
            <li>Submission closes at lock time, then lineups become read-only.</li>
            <li>Final ranking is based on contest scoring after settlement.</li>
          </ul>
        </section>
      ) : null}

      <LineupBuilderModal
        open={showBuilder}
        contestTitle={contest?.title ?? "Contest"}
        contestStatus={contest?.status ?? "OPEN"}
        lockAt={contest?.lockAt ?? null}
        entryFeeLabel={entryFee}
        rosterSize={rosterSize}
        rule={rule}
        lineupSlots={lineupSlots.length === rosterSize ? lineupSlots : toSlots(selectedIds, rosterSize)}
        options={options}
        busy={submitBusy}
        flashMessage={builderFlash}
        onClose={() => setShowBuilder(false)}
        onSelectSlot={(slot) => setActiveBuilderSlot(slot)}
        onSelectCard={handleSelectCard}
        onRemoveSlot={handleRemoveSlot}
        onSaveDraft={() => {
          setBuilderFlash("Draft saved locally.");
          setShowBuilder(false);
        }}
        onSubmit={() => void submitLineup()}
      />
    </SiteShell>
  );
}
