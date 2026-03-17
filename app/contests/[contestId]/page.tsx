"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findDuplicateLineupIdentityKeys } from "@/lib/domain/contests/lineup-identity";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { LineupBuilderModal } from "@/components/contests/LineupBuilderModal";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { toMvpCardView } from "@/components/contests/lineupCardMapper";
import { getLogicalTokenKey } from "@/lib/domain/contests/lineup-token";
import type { ContestEntryStatus, ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";

type ContestDetail = {
  contest: {
    id: string;
    title: string;
    code: string;
    status: ContestStatus;
    liveAt: string | null;
    lockAt: string | null;
    endsAt: string | null;
    openAt?: string | null;
    rules: ContestRule[];
    seasonName?: string | null;
    seasonId?: string | null;
    leagueTierRequired?: string | null;
    _count: { entries: number };
  };
  userEntry: {
    id: string;
    status: ContestEntryStatus;
    rosterLocks: Array<{ ownedCardInstanceId: string }>;
  } | null;
  rewardGrants?: Array<{
    id: string;
    type: "POINTS" | "PACK" | "CARD_INSTANCE";
    amount: number | null;
    packDefinitionId: string | null;
    createdAt: string;
  }>;
};

type RankingPayload = {
  contest: { status: ContestStatus };
  rankings: Array<{ id: string; userId: string; rank: number; score: number; displayName: string }>;
};

type RewardPayload = {
  hasPolicyData: boolean;
  tiers: Array<{ label: string; bundleName: string; pointsAmount: number; xpAmount: number; packsCount: number }>;
};



type ScoreBreakdownRow = {
  id: string;
  finalScore: number;
  tokenProject: { displayName: string };
  cardInstance: {
    id?: string;
    cardTemplate: {
      name: string;
      imageUrl: string | null;
      rarity: { code: string } | null;
      edition: { code: string } | null;
    };
  };
};

type SlotCardView = {
  card: LineupOption;
  finalScore: number | null;
};

function toSlots(roster: string[], rosterSize: number): Array<string | null> {
  const sanitized = roster.slice(0, rosterSize);
  while (sanitized.length < rosterSize) sanitized.push("");
  return sanitized.map((value) => value || null);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatHMS(lockAt: string | null, nowTs: number): string {
  if (!lockAt) return "--:--:--";
  const diff = new Date(lockAt).getTime() - nowTs;
  if (diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const RARITY_COLOR: Record<string, string> = {
  LEGENDARY: "#c8a84b",
  EPIC: "#a855f7",
  RARE: "#3b82f6",
  UNCOMMON: "#22c55e",
  COMMON: "#6b7280",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [rewards, setRewards] = useState<RewardPayload | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [lineupSlots, setLineupSlots] = useState<Array<string | null>>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeBuilderSlot, setActiveBuilderSlot] = useState<number>(0);
  const [error, setError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [builderFlash, setBuilderFlash] = useState("");
  const [builderError, setBuilderError] = useState("");
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownRow[] | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Guards slot state so re-fetches (e.g. session refresh) never overwrite user's in-progress selection
  const slotsInitializedRef = useRef(false);

  const contestData = detail?.contest;
  const rule = contestData?.rules[0];
  const rosterSize = rule?.maxRosterSize ?? 5;

  const loadAll = useCallback(async () => {
    setIsLoadingPage(true);
    setHasAttemptedLoad(true);
    setError("");

    try {
      const detailRes = await fetch(`/api/contests/${params.contestId}`, { cache: "no-store" });

      let detailPayload: ContestDetail | null = null;
      let rankingPayload: RankingPayload | null = null;

      if (detailRes.ok) {
        detailPayload = (await detailRes.json()) as ContestDetail;
        setDetail(detailPayload);
        // Only initialize slots once per page mount — never overwrite user's in-progress selection
        if (!slotsInitializedRef.current) {
          slotsInitializedRef.current = true;
          const nextRosterSize = detailPayload.contest.rules?.[0]?.maxRosterSize ?? 5;
          const roster = detailPayload.userEntry?.rosterLocks?.map((row) => row.ownedCardInstanceId) ?? [];
          if (roster.length > 0) {
            setLineupSlots(toSlots(roster, nextRosterSize));
            try { localStorage.removeItem(`lineup-draft-${params.contestId}`); } catch {}
          } else {
            try {
              const localDraft = localStorage.getItem(`lineup-draft-${params.contestId}`);
              if (localDraft) {
                const parsed = JSON.parse(localDraft) as Array<string | null>;
                setLineupSlots(toSlots(parsed.filter(Boolean) as string[], nextRosterSize));
              } else {
                setLineupSlots(toSlots([], nextRosterSize));
              }
            } catch {
              setLineupSlots(toSlots([], nextRosterSize));
            }
          }
        }
      } else {
        const payload = (await detailRes.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Contest is unavailable or still being prepared.");
        setDetail(null);
        setRanking(null);
        setOptions([]);
        setRewards(null);
        setScoreBreakdown(null);
        return;
      }

      const rankingReq = fetch(`/api/contests/${params.contestId}/ranking`, { cache: "no-store" });
      const rewardsReq = fetch(`/api/contests/${params.contestId}/reward-preview`, { cache: "no-store" });
      const optionsReq = me
        ? fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" })
        : Promise.resolve<Response | null>(null);

      const [rankingRes, rewardsRes, optionsRes] = await Promise.all([rankingReq, rewardsReq, optionsReq]);

      if (rankingRes.ok) {
        rankingPayload = (await rankingRes.json()) as RankingPayload;
        setRanking(rankingPayload);
      } else {
        setRanking(null);
      }
      if (rewardsRes.ok) {
        setRewards((await rewardsRes.json()) as RewardPayload);
      } else {
        setRewards(null);
      }
      if (optionsRes?.ok) {
        const payload = (await optionsRes.json().catch(() => null)) as { options?: LineupOption[] } | null;
        setOptions(Array.isArray(payload?.options) ? payload.options : []);
      } else {
        setOptions([]);
      }

      const shouldLoadBreakdown = Boolean(detailPayload?.userEntry && detailPayload.contest.status === "SETTLED" && me);
      if (shouldLoadBreakdown) {
        const breakdownRes = await fetch(`/api/contests/${params.contestId}/my-score-breakdown`, { cache: "no-store" });
        if (breakdownRes.ok) {
          const payload = (await breakdownRes.json().catch(() => null)) as { rows?: ScoreBreakdownRow[] } | null;
          setScoreBreakdown(Array.isArray(payload?.rows) ? payload.rows : []);
        } else {
          setScoreBreakdown([]);
        }
      } else {
        setScoreBreakdown(null);
      }
    } catch {
      setDetail(null);
      setRanking(null);
      setRewards(null);
      setOptions([]);
      setScoreBreakdown(null);
      setError("Contest is unavailable or still being prepared.");
    } finally {
      setIsLoadingPage(false);
    }
  }, [me, params.contestId]);

  useEffect(() => {
    if (loading) return;
    void loadAll();
  }, [loading, loadAll]);

  useEffect(() => {
    if (!builderFlash) return;
    const id = window.setTimeout(() => setBuilderFlash(""), 2400);
    return () => window.clearTimeout(id);
  }, [builderFlash]);
  useEffect(() => {
    if (!detail?.userEntry || contestData?.status !== "SETTLED") return;
    if (!scoreBreakdown || scoreBreakdown.length === 0) return;
    const hasSlots = lineupSlots.some(Boolean);
    if (hasSlots) return;

    const fallbackLineupIds = scoreBreakdown
      .map((row) => row.cardInstance.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    setLineupSlots(toSlots(fallbackLineupIds, rosterSize));
  }, [contestData?.status, detail?.userEntry, lineupSlots, rosterSize, scoreBreakdown]);


  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const entryFee = rule?.entryFeeEnabled ? `${rule.entryFeeAmount ?? 0} pts` : "Free";
  const canManageLineup = contestData?.status === "OPEN" && Boolean(me);
  const hasEntry = Boolean(detail?.userEntry);

  const selectedIds = useMemo(() => lineupSlots.filter(Boolean) as string[], [lineupSlots]);

  const optionById = useMemo(() => new Map(options.map((item) => [item.instanceId, item])), [options]);
  const selectedLogicalTokenKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const instanceId of lineupSlots) {
      if (!instanceId) continue;
      const item = optionById.get(instanceId);
      if (!item) continue;
      keys.add(getLogicalTokenKey({ tokenProjectId: item.tokenProjectId, cardTemplateId: item.cardTemplateId }));
    }
    return keys;
  }, [lineupSlots, optionById]);

  const myRanking = useMemo(() => {
    if (!me || !ranking) return null;
    return ranking.rankings.find((r) => r.userId === me.user.id) ?? null;
  }, [ranking, me]);

  const slotCards = useMemo(() => {
    const breakdownByInstanceId = new Map((scoreBreakdown ?? []).map((row) => [row.cardInstance.id, row]));

    return lineupSlots.map<SlotCardView | null>((id) => {
      if (!id) return null;
      const optionCard = optionById.get(id);
      if (optionCard) {
        const row = breakdownByInstanceId.get(id);
        return { card: optionCard, finalScore: row?.finalScore ?? null };
      }

      const row = breakdownByInstanceId.get(id);
      if (!row) return null;

      const fallback: LineupOption = {
        instanceId: id,
        cardTemplateId: id,
        isLockedByActiveContest: false,
        cardSetId: "settled",
        cardSetCode: "SETTLED",
        cardSetName: "Settled lineup",
        rarityCode: row.cardInstance.cardTemplate.rarity?.code ?? "COMMON",
        editionCode: row.cardInstance.cardTemplate.edition?.code ?? "BASE",
        name: row.cardInstance.cardTemplate.name,
        imageUrl: row.cardInstance.cardTemplate.imageUrl,
        tokenProjectName: row.tokenProject.displayName,
        tokenProjectId: null,
      };

      return { card: fallback, finalScore: row.finalScore };
    });
  }, [lineupSlots, optionById, scoreBreakdown]);

  const submitLineup = async (isDraft = false) => {
    if (!contestData || selectedIds.length !== rosterSize || contestData.status !== "OPEN") return;
    if (selectedLogicalTokenKeys.size !== selectedIds.length) {
      setError("This token is already used in your lineup.");
      return;
    }
    setSubmitBusy(true);
    setError("");
    setBuilderError("");
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
    try { localStorage.removeItem(`lineup-draft-${params.contestId}`); } catch {}
    await loadAll();
    setSubmitBusy(false);
    setShowBuilder(false);
    setBuilderFlash(isDraft ? "Draft saved." : "✓ Lineup submitted successfully!");
  };

  const handleSelectCard = (instanceId: string, targetSlotIndex: number | null) => {
    if (!canManageLineup) return;
    setError("");
    const option = optionById.get(instanceId);
    if (!option) return;

    const incomingTokenKey = getLogicalTokenKey({ tokenProjectId: option.tokenProjectId, cardTemplateId: option.cardTemplateId });

    setLineupSlots((prev) => {
      const next = [...(prev.length === rosterSize ? prev : toSlots(prev.filter(Boolean) as string[], rosterSize))];
      const targetIndex = targetSlotIndex ?? activeBuilderSlot;
      const duplicateTokenIndex = next.findIndex((value, index) => {
        if (!value || index === targetIndex) return false;
        const selectedOption = optionById.get(value);
        if (!selectedOption) return false;
        const selectedTokenKey = getLogicalTokenKey({
          tokenProjectId: selectedOption.tokenProjectId,
          cardTemplateId: selectedOption.cardTemplateId,
        });
        return selectedTokenKey === incomingTokenKey;
      });

      if (duplicateTokenIndex >= 0) {
        setError("This token is already used in your lineup.");
        return next;
      }

      const existingIndex = next.findIndex((value) => value === instanceId);

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
    setBuilderError("");
    setLineupSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  };

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (!hasAttemptedLoad || isLoadingPage || (loading && !detail)) {
    return (
      <SiteShell>
        <style>{CSS}</style>
        <div className="cpd-skeleton">
          <div className="cpd-skeleton-topbar" />
          <div className="cpd-skeleton-hero" />
          <div className="cpd-skeleton-body">
            <div className="cpd-skeleton-main" />
            <div className="cpd-skeleton-side" />
          </div>
        </div>
      </SiteShell>
    );
  }

  if (!detail) {
    return (
      <SiteShell>
        <style>{CSS}</style>
        <div className="cpd-empty-state">
          <h1>Contest unavailable or still being prepared</h1>
          <p>This contest is currently unavailable. Please try again in a few moments.</p>
        </div>
      </SiteShell>
    );
  }

  const contest = detail.contest;
  const status = contest.status;
  const isOpen = status === "OPEN";
  const isLocked = status === "LOCKED";
  const isLive = status === "LIVE";
  const isSettled = status === "SETTLED";
  const lockAtMs = contest.lockAt ? new Date(contest.lockAt).getTime() : Number.POSITIVE_INFINITY;
  const endsAtMs = contest.endsAt ? new Date(contest.endsAt).getTime() : Number.POSITIVE_INFINITY;
  const beforeLock = nowTs < lockAtMs;
  const beforeEnd = nowTs < endsAtMs;

  const showRegistrationCountdown = isOpen || (isLive && beforeLock);
  const showLiveWindow = isLocked || (isLive && !beforeLock && beforeEnd);
  const showFinished = isSettled || !beforeEnd;

  const scheduleSteps = [
    {
      key: "open",
      label: "Registration open",
      date: contest.openAt ? fmtDate(contest.openAt) : "Contest open",
      active: isOpen,
      done: isLocked || isLive || isSettled,
    },
    {
      key: "lock",
      label: "Lineup lock",
      date: fmtDate(contest.lockAt),
      active: isLocked,
      done: isLive || isSettled,
    },
    {
      key: "end",
      label: "End & snapshot",
      date: fmtDate(contest.endsAt),
      active: isLive,
      done: isSettled,
    },
  ];

  const rewardPoints = Math.max(100, rosterSize * 40);
  const fieldTier = contest._count.entries >= 100 ? "High" : contest._count.entries >= 30 ? "Mid" : "Early";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SiteShell>
      <style>{CSS}</style>
      <div className="cpd-page">

        {/* ── STICKY TOPBAR ─────────────────────────────────────────────── */}
        <div className="cpd-topbar">
          <div className="cpd-topbar-left">
            {isOpen && <span className="cpd-dot-live" />}
            <span className="cpd-topbar-name">Contest {contest.code}</span>
            {(contest.seasonName || contest.leagueTierRequired) && (
              <span className="cpd-league-badge">
                {contest.seasonName ?? contest.leagueTierRequired}
              </span>
            )}
          </div>
          <div className="cpd-topbar-right">
            {showRegistrationCountdown && (
              <>
                <span className="cpd-topbar-label">Lock in</span>
                <span className="cpd-countdown">{formatHMS(contest.lockAt, nowTs)}</span>
              </>
            )}
            {showLiveWindow && (
              <>
                <span className="cpd-status-chip" data-status={isLive ? "LIVE" : "LOCKED"}>
                  {isLive ? "● In Progress" : "🔒 Locked"}
                </span>
                <span className="cpd-topbar-label">Ends in</span>
                <span className="cpd-countdown">{formatHMS(contest.endsAt, nowTs)}</span>
              </>
            )}
            {showFinished && <span className="cpd-status-chip" data-status="SETTLED">Finished</span>}
          </div>
        </div>

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div className="cpd-hero">
          <div className="cpd-hero-left">
            <p className="cpd-hero-eyebrow">CONTEST</p>
            <h1 className="cpd-hero-title">
              {contest.code}
              <br />
              {contest.title}
            </h1>
          </div>
          <div className="cpd-stat-pills">
            <div className="cpd-stat-pill">
              <span className="cpd-stat-label">Participants</span>
              <span className="cpd-stat-value">{contest._count.entries}</span>
            </div>
            <div className="cpd-stat-pill">
              <span className="cpd-stat-label">Your rank</span>
              <span className={`cpd-stat-value ${myRanking ? "cpd-stat-gold" : ""}`}>
                {myRanking ? `#${myRanking.rank}` : "—"}
              </span>
            </div>
            <div className="cpd-stat-pill">
              <span className="cpd-stat-label">Your score</span>
              <span className="cpd-stat-value">
                {myRanking ? myRanking.score.toFixed(2) : "—"}
              </span>
            </div>
          </div>
        </div>

        {error && <div className="cpd-banner cpd-banner-warn">{error}</div>}
        {builderError && <div className="cpd-banner cpd-banner-warn">{builderError}</div>}
        {builderFlash && !showBuilder && (
          <div className="cpd-banner cpd-banner-success">{builderFlash}</div>
        )}

        {/* ── MAIN GRID ─────────────────────────────────────────────────── */}
        <div className="cpd-grid">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="cpd-main">

            {/* LINEUP BLOCK */}
            <div className={`cpd-block ${isLocked || isLive ? "cpd-block-locked" : ""}`}>
              <div className="cpd-block-header">
                <div className="cpd-lineup-title-row">
                  <h2 className="cpd-block-title">Your Lineup</h2>
                  {isLocked && <span className="cpd-status-badge cpd-badge-locked">🔒 Locked</span>}
                  {isLive && <span className="cpd-status-badge cpd-badge-live">● Live</span>}
                  {isSettled && <span className="cpd-status-badge cpd-badge-settled">Settled</span>}
                </div>
                <div className="cpd-lineup-actions">
                  <span className="cpd-block-meta">{selectedIds.length}/{rosterSize} slots filled</span>
                  {isOpen && me && (
                    <button
                      type="button"
                      className="cpd-btn-gold"
                      onClick={() => { setShowBuilder(true); setBuilderFlash(""); }}
                    >
                      Build Lineup ▶
                    </button>
                  )}
                </div>
              </div>

              <div className={`cpd-slots-grid cpd-slots-grid-${rosterSize}`}>
                {Array.from({ length: rosterSize }).map((_, i) => {
                  const slotCard = slotCards[i];
                  if (!slotCard) {
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`cpd-slot cpd-slot-empty ${isOpen ? "cpd-slot-interactive" : "cpd-slot-locked-empty"}`}
                        onClick={() => {
                          if (!isOpen) return;
                          setActiveBuilderSlot(i);
                          setShowBuilder(true);
                          setBuilderFlash("");
                        }}
                        disabled={!isOpen}
                      >
                        <span className="cpd-slot-number">{i + 1}</span>
                        <span className="cpd-slot-add-hint">Select</span>
                      </button>
                    );
                  }
                  return (
                    <div
                      key={i}
                      className={`cpd-slot-mvp${isOpen ? " cpd-slot-interactive" : ""}`}
                      onClick={() => isOpen && (setShowBuilder(true), setBuilderFlash(""))}
                      role={isOpen ? "button" : undefined}
                      tabIndex={isOpen ? 0 : undefined}
                    >
                      <MvpCardTile card={toMvpCardView(slotCard.card)} variant="compact" interactive={false} />
                      {(isLocked || isLive) && (
                        <div className="cpd-slot-lock-overlay">🔒 Locked</div>
                      )}
                      {isSettled && (
                        <div className="cpd-slot-final-score" aria-label="Final card score">
                          <span className="cpd-slot-final-score-label">Score</span>
                          <span className="cpd-slot-final-score-value">
                            {slotCard.finalScore !== null ? `${slotCard.finalScore.toFixed(2)} pts` : "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isOpen && selectedIds.length === rosterSize && (
                <button
                  type="button"
                  className={`cpd-btn-submit-main${hasEntry ? " cpd-btn-submit-update" : ""}`}
                  onClick={() => void submitLineup()}
                  disabled={submitBusy}
                  style={{ marginTop: 14 }}
                >
                  {submitBusy ? "Submitting…" : hasEntry ? "Update Lineup" : "Submit Lineup"}
                </button>
              )}

              {(isLocked || isLive) && (
                <p className="cpd-lineup-locked-note">🔒 Lineup locked — no changes allowed</p>
              )}

              {!me && isOpen && (
                <p className="cpd-lineup-locked-note">Sign in to build and submit your lineup.</p>
              )}

              {detail.userEntry?.status === "SUBMITTED" && !builderFlash && (
                <div className="cpd-lineup-submitted">✓ Lineup submitted</div>
              )}
            </div>

            {/* LEADERBOARD BLOCK */}
            <div className="cpd-block">
              <div className="cpd-block-header">
                <h2 className="cpd-block-title">Leaderboard</h2>
                <span className="cpd-block-meta">{ranking?.rankings.length ?? 0} entries</span>
              </div>

              {(ranking?.rankings.length ?? 0) === 0 ? (
                <p className="cpd-empty-msg">No entries yet — be the first to join</p>
              ) : (
                <div className="cpd-leaderboard">
                  {ranking?.rankings.map((row) => {
                    const isMe = row.userId === me?.user.id;
                    const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : null;
                    return (
                      <div
                        key={row.id}
                        className={`cpd-lb-row ${isMe ? "cpd-lb-row-me" : ""} ${row.rank <= 3 ? "cpd-lb-row-top" : ""}`}
                      >
                        <span className="cpd-lb-rank">{medal ?? `#${row.rank}`}</span>
                        <span className="cpd-lb-name">{row.displayName}</span>
                        <b className="cpd-lb-score">{row.score.toFixed(2)}</b>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
          <div className="cpd-sidebar">

            {/* REWARDS */}
            <div className="cpd-block">
              <h3 className="cpd-block-title">Rewards</h3>
              <div className="cpd-rewards-list">
                {(rewards?.tiers ?? []).length > 0
                  ? (rewards?.tiers ?? []).map((tier, idx) => (
                      <div
                        key={`${tier.label}-${idx}`}
                        className={`cpd-reward-row ${idx === 0 ? "cpd-reward-row-first" : ""}`}
                      >
                        <span className="cpd-reward-label">{tier.label}</span>
                        <div className="cpd-reward-amounts">
                          {tier.pointsAmount > 0 && (
                            <span className={idx === 0 ? "cpd-reward-gold" : ""}>
                              {tier.pointsAmount} pts
                            </span>
                          )}
                          {tier.xpAmount > 0 && <span>{tier.xpAmount} XP</span>}
                          {tier.packsCount > 0 && (
                            <span>🎁 {tier.packsCount} pack{tier.packsCount > 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>
                    ))
                  : (
                    <>
                      <div className="cpd-reward-row cpd-reward-row-first">
                        <span className="cpd-reward-label">#1</span>
                        <span className="cpd-reward-gold">{rewardPoints} pts</span>
                      </div>
                      <div className="cpd-reward-row">
                        <span className="cpd-reward-label">#2</span>
                        <span>{Math.round(rewardPoints * 0.6)} pts</span>
                      </div>
                      <div className="cpd-reward-row">
                        <span className="cpd-reward-label">#3</span>
                        <span>{Math.round(rewardPoints * 0.3)} pts</span>
                      </div>
                    </>
                  )}
              </div>
            </div>

            {/* INFO */}
            <div className="cpd-block">
              <h3 className="cpd-block-title">Info</h3>
              <dl className="cpd-info-grid">
                <dt>Lineup</dt>
                <dd>{rosterSize} cards</dd>
                <dt>Entry fee</dt>
                <dd>{entryFee}</dd>
                <dt>League</dt>
                <dd>{contest.seasonName ?? "Open"}</dd>
                <dt>Field</dt>
                <dd>{fieldTier}</dd>
                <dt>Code</dt>
                <dd className="cpd-mono">{contest.code}</dd>
              </dl>
            </div>

            {/* SCHEDULE */}
            <div className="cpd-block">
              <h3 className="cpd-block-title">Schedule</h3>
              <div className="cpd-schedule">
                {scheduleSteps.map((step, idx) => {
                  const dotClass = step.done
                    ? "cpd-step-dot-done"
                    : step.active
                    ? "cpd-step-dot-live"
                    : "cpd-step-dot-pending";
                  return (
                    <div
                      key={step.key}
                      className={`cpd-schedule-step ${step.active ? "cpd-step-active" : ""} ${step.done ? "cpd-step-done" : ""}`}
                    >
                      <div className="cpd-step-indicator">
                        <span className={`cpd-step-dot ${dotClass}`} />
                        {idx < scheduleSteps.length - 1 && <span className="cpd-step-line" />}
                      </div>
                      <div className="cpd-step-content">
                        <p className="cpd-step-label">{step.label}</p>
                        <p className="cpd-step-date">{step.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

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
        selectedLogicalTokenKeys={selectedLogicalTokenKeys}
        busy={submitBusy}
        flashMessage={builderFlash}
        errorMessage={builderError}
        onClose={() => setShowBuilder(false)}
        onSelectSlot={(slot) => setActiveBuilderSlot(slot)}
        onSelectCard={handleSelectCard}
        onRemoveSlot={handleRemoveSlot}
        onSaveDraft={async () => {
          if (selectedIds.length === rosterSize) {
            await submitLineup(true);
          } else {
            try {
              localStorage.setItem(`lineup-draft-${params.contestId}`, JSON.stringify(lineupSlots));
            } catch {}
            setBuilderFlash("Draft saved.");
            setShowBuilder(false);
          }
        }}
        onSubmit={() => void submitLineup()}
      />
    </SiteShell>
  );
}

// ─── Embedded styles ──────────────────────────────────────────────────────────

const CSS = `
  /* ── Design tokens ── */
  .cpd-page {
    --bg-page:     #0c0c12;
    --bg-surface:  #141420;
    --bg-surface2: #1c1c2c;
    --border:      rgba(255,255,255,0.07);
    --gold:        #c8a84b;
    --gold-bright: #ecc96a;
    --green:       #2db56e;
    --red:         #e63946;
    --muted:       #5a5a7a;
    --text:        #e2ddd4;
    font-family: 'DM Sans', 'Inter', sans-serif;
    color: var(--text);
  }

  /* ── Topbar ── */
  .cpd-topbar {
    position: sticky;
    top: var(--nav-h);
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    margin-bottom: 4px;
    isolation: isolate;
    background: rgba(12,12,18,0.97);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
  }
  .cpd-topbar-left  { display: flex; align-items: center; gap: 10px; }
  .cpd-topbar-right { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 6px; }
  .cpd-topbar-name  { font-size: 0.9rem; font-weight: 600; color: #e0e0e8; }
  .cpd-topbar-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }

  .cpd-countdown {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--gold-bright);
    letter-spacing: 0.04em;
  }
  .cpd-league-badge {
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    padding: 2px 9px; border-radius: 20px;
    background: rgba(200,168,75,0.12); border: 1px solid rgba(200,168,75,0.3); color: var(--gold);
  }
  .cpd-status-chip {
    font-size: 0.67rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
    padding: 3px 10px; border-radius: 20px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
  }
  .cpd-status-chip[data-status="LIVE"]    { color: var(--green); border-color: rgba(45,181,110,0.3); background: rgba(45,181,110,0.08); animation: cpdLivePulse 2s ease-in-out infinite; }
  .cpd-status-chip[data-status="LOCKED"]  { color: #d7d7de; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); }
  .cpd-status-chip[data-status="SETTLED"] { color: var(--muted); border-color: rgba(90,90,122,0.3); background: rgba(90,90,122,0.08); }

  /* Live dot */
  .cpd-dot-live {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    background: var(--green); flex-shrink: 0;
    animation: cpdPulse 2s ease-in-out infinite;
  }
  @keyframes cpdPulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
  @keyframes cpdLivePulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }

  /* ── Hero ── */
  .cpd-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .cpd-hero-left { flex: 1; min-width: 200px; }
  .cpd-hero-eyebrow {
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em;
    color: var(--gold); margin: 0 0 8px; font-family: 'DM Sans', sans-serif;
  }
  .cpd-hero-title {
    font-family: 'Bebas Neue', 'Barlow Condensed', sans-serif;
    font-size: clamp(3rem, 7vw, 5.5rem);
    line-height: 0.85;
    letter-spacing: 0.02em;
    color: #fff;
    margin: 0;
  }
  .cpd-stat-pills { display: flex; gap: 10px; flex-wrap: wrap; }
  .cpd-stat-pill {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 16px 20px; min-width: 90px;
    background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px;
  }
  .cpd-stat-label {
    font-size: 0.62rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--muted); white-space: nowrap;
  }
  .cpd-stat-value { font-size: 1.3rem; font-weight: 700; color: var(--text); line-height: 1; }
  .cpd-stat-gold  { color: var(--gold-bright); }

  /* ── Banners ── */
  .cpd-banner { padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; margin-bottom: 16px; }
  .cpd-banner-warn    { background: rgba(230,57,70,0.1); border: 1px solid rgba(230,57,70,0.25); color: #f87171; }
  .cpd-banner-info    { background: rgba(200,168,75,0.08); border: 1px solid rgba(200,168,75,0.2); color: var(--gold); }
  .cpd-banner-success { background: rgba(45,181,110,0.08); border: 1px solid rgba(45,181,110,0.25); color: var(--green); font-weight: 600; }

  /* ── Main grid ── */
  .cpd-grid { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 20px; align-items: start; }

  /* ── Shared block ── */
  .cpd-block {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .cpd-block-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 12px; margin-bottom: 18px; flex-wrap: wrap;
  }
  .cpd-block-title {
    font-family: 'Bebas Neue', 'Barlow Condensed', sans-serif;
    font-size: 1.25rem; letter-spacing: 0.06em; color: var(--text); margin: 0; line-height: 1.1;
  }
  .cpd-block-meta  { font-size: 0.75rem; color: var(--muted); margin: 4px 0 0; }
  .cpd-empty-msg   { font-size: 0.85rem; color: var(--muted); text-align: center; padding: 24px 0; margin: 0; }
  .cpd-block-locked { opacity: 0.9; }

  /* ── Lineup title row ── */
  .cpd-lineup-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .cpd-status-badge {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px;
    border-radius: 20px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  }
  .cpd-badge-locked { background: rgba(255,200,0,0.08); border: 1px solid rgba(255,200,0,0.25); color: #f5c842; }
  .cpd-badge-live   { background: rgba(45,181,110,0.1); border: 1px solid rgba(45,181,110,0.3); color: var(--green); }
  .cpd-badge-settled{ background: rgba(200,168,75,0.1); border: 1px solid rgba(200,168,75,0.3); color: var(--gold); }

  /* ── Lineup actions ── */
  .cpd-lineup-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .cpd-btn-gold {
    display: inline-flex; align-items: center; gap: 4px; padding: 8px 18px;
    border: none; border-radius: 8px;
    background: linear-gradient(135deg, var(--gold), var(--gold-bright));
    color: #0c0c12; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em;
    cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
    font-family: 'DM Sans', sans-serif;
  }
  .cpd-btn-gold:hover { opacity: 0.85; }
  .cpd-btn-submit-main {
    display: flex; align-items: center; justify-content: center;
    width: 100%; padding: 13px 18px;
    border: none; border-radius: 10px;
    background: #c8a84b; color: #0c0c12;
    font-size: 0.92rem; font-weight: 700; letter-spacing: 0.03em;
    cursor: pointer; transition: opacity 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .cpd-btn-submit-main:hover    { opacity: 0.87; }
  .cpd-btn-submit-main:disabled { opacity: 0.45; cursor: not-allowed; }
  .cpd-btn-submit-update {
    background: var(--green); color: #0c0c12;
  }
  .cpd-lineup-locked-note {
    margin: 12px 0 0; padding: 9px 14px; border-radius: 8px;
    background: rgba(255,200,0,0.05); border: 1px solid rgba(255,200,0,0.15);
    font-size: 0.78rem; color: #f5c842; font-weight: 600; text-align: center; margin-top: 14px;
  }

  /* ── Slot grid ── */
  .cpd-slots-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }

  /* Base slot */
  .cpd-slot {
    position: relative; aspect-ratio: 2/3; border-radius: 10px;
    overflow: hidden; cursor: default; padding: 0; border: none; background: none;
    transition: transform 0.12s, border-color 0.15s;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center;
  }
  .cpd-slot-interactive { cursor: pointer; }
  .cpd-slot-interactive:hover { transform: translateY(-3px); }

  /* Empty slot */
  .cpd-slot-empty {
    border: 2px dashed rgba(255,255,255,0.1);
    background: var(--bg-surface2);
  }
  .cpd-slot-locked-empty { border-color: rgba(255,255,255,0.06) !important; cursor: not-allowed; opacity: 0.4; }
  .cpd-slot-empty.cpd-slot-interactive:hover {
    border-color: rgba(200,168,75,0.45); background: rgba(200,168,75,0.04);
  }
  .cpd-slot-number   { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; color: rgba(255,255,255,0.15); }
  .cpd-slot-add-hint { font-size: 0.58rem; font-weight: 600; color: rgba(200,168,75,0.45); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 4px; }

  /* Filled slot using MvpCardTile */
  .cpd-slot-mvp {
    position: relative; border-radius: 10px; overflow: hidden;
    cursor: default; transition: transform 0.12s;
  }
  .cpd-slot-mvp.cpd-slot-interactive { cursor: pointer; }
  .cpd-slot-mvp.cpd-slot-interactive:hover { transform: translateY(-3px); }
  .cpd-slot-mvp .mvp-premium-card { border-radius: 10px; }

  .cpd-slot-lock-overlay {
    position: absolute; inset: 0;
    background: rgba(12,12,18,0.72);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.55);
    letter-spacing: 0.06em; backdrop-filter: blur(2px);
  }
  .cpd-slot-final-score {
    position: absolute;
    top: 8px;
    right: 8px;
    border-radius: 10px;
    border: 1px solid rgba(246,222,150,0.42);
    background: linear-gradient(140deg, rgba(10,12,18,0.92), rgba(30,25,16,0.9));
    color: #f6de96;
    padding: 6px 8px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    backdrop-filter: blur(6px);
    box-shadow: 0 4px 14px rgba(0,0,0,0.35);
  }
  .cpd-slot-final-score-label {
    font-size: 0.52rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.68);
    line-height: 1;
    margin-bottom: 3px;
  }
  .cpd-slot-final-score-value {
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }
  .cpd-lineup-submitted {
    margin: 14px 0 0; padding: 9px 14px; border-radius: 8px;
    background: rgba(45,181,110,0.08); border: 1px solid rgba(45,181,110,0.2);
    font-size: 0.8rem; color: var(--green); font-weight: 600;
  }

  /* ── Leaderboard ── */
  .cpd-leaderboard { display: flex; flex-direction: column; gap: 2px; }
  .cpd-lb-row {
    display: grid; grid-template-columns: 42px 1fr auto;
    align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: 8px;
    border: 1px solid transparent;
    font-size: 0.85rem; transition: background 0.12s;
  }
  .cpd-lb-row:hover   { background: rgba(255,255,255,0.03); }
  .cpd-lb-row-me      { background: rgba(200,168,75,0.07); border-color: rgba(200,168,75,0.2); border-left: 3px solid var(--gold); }
  .cpd-lb-row-top .cpd-lb-rank { font-size: 1rem; }
  .cpd-lb-rank  { font-size: 0.8rem; font-weight: 700; color: var(--muted); text-align: center; }
  .cpd-lb-name  { color: var(--text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cpd-lb-row-me .cpd-lb-name { color: var(--gold-bright); font-weight: 700; }
  .cpd-lb-score { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: rgba(255,255,255,0.55); white-space: nowrap; }

  /* ── Sidebar ── */
  .cpd-sidebar .cpd-block { margin-bottom: 12px; }

  /* ── Rewards ── */
  .cpd-rewards-list { display: flex; flex-direction: column; gap: 2px; }
  .cpd-reward-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 9px 10px; border-radius: 8px; font-size: 0.82rem;
    border: 1px solid transparent;
    border-bottom: 1px solid var(--border);
  }
  .cpd-reward-row:last-child { border-bottom: none; }
  .cpd-reward-row-first { background: rgba(200,168,75,0.06); border-color: rgba(200,168,75,0.18) !important; }
  .cpd-reward-label       { color: rgba(255,255,255,0.5); font-weight: 500; }
  .cpd-reward-row-first .cpd-reward-label { color: var(--text); font-weight: 700; font-size: 0.9rem; }
  .cpd-reward-amounts { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .cpd-reward-gold    { color: var(--gold-bright); font-weight: 700; }

  /* ── Info ── */
  .cpd-info-grid {
    display: grid; grid-template-columns: auto 1fr; gap: 8px 14px; margin: 0; font-size: 0.82rem;
  }
  .cpd-info-grid dt { color: var(--muted); font-weight: 500; white-space: nowrap; padding: 4px 0; border-bottom: 1px solid var(--border); }
  .cpd-info-grid dd { margin: 0; color: var(--text); font-weight: 600; padding: 4px 0; border-bottom: 1px solid var(--border); }
  .cpd-mono { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: rgba(255,255,255,0.45); }

  /* ── Schedule ── */
  .cpd-schedule { display: flex; flex-direction: column; }
  .cpd-schedule-step { display: flex; gap: 12px; }
  .cpd-step-indicator { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 14px; padding-top: 3px; }
  .cpd-step-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; display: block; }
  .cpd-step-dot-done    { background: var(--green); }
  .cpd-step-dot-live    { background: var(--green); animation: cpdPulse 1.8s ease-in-out infinite; box-shadow: 0 0 6px rgba(45,181,110,0.6); }
  .cpd-step-dot-pending { background: transparent; border: 2px solid rgba(255,255,255,0.15); }
  .cpd-step-line { flex: 1; width: 1px; background: rgba(255,255,255,0.07); margin: 4px 0; min-height: 18px; }
  .cpd-schedule-step:last-child .cpd-step-line { display: none; }
  .cpd-step-content { padding-bottom: 16px; }
  .cpd-step-label { font-size: 0.82rem; font-weight: 600; color: rgba(255,255,255,0.6); margin: 0 0 2px; }
  .cpd-step-active .cpd-step-label { color: var(--green); }
  .cpd-step-done .cpd-step-label   { color: var(--muted); }
  .cpd-step-date { font-size: 0.7rem; color: var(--muted); margin: 0; font-family: 'JetBrains Mono', monospace; }
  .cpd-step-active .cpd-step-date  { color: var(--green); font-weight: 600; }

  /* ── Skeleton ── */
  .cpd-skeleton      { display: flex; flex-direction: column; gap: 14px; }
  .cpd-skeleton-topbar { height: 44px; border-radius: 8px; background: rgba(255,255,255,0.04); animation: cpdShimmer 1.6s infinite; }
  .cpd-skeleton-hero   { height: 140px; border-radius: 14px; background: rgba(255,255,255,0.04); animation: cpdShimmer 1.6s infinite 0.1s; }
  .cpd-skeleton-body   { display: grid; grid-template-columns: 1fr 300px; gap: 16px; }
  .cpd-skeleton-main   { height: 480px; border-radius: 14px; background: rgba(255,255,255,0.04); animation: cpdShimmer 1.6s infinite 0.2s; }
  .cpd-skeleton-side   { height: 380px; border-radius: 14px; background: rgba(255,255,255,0.04); animation: cpdShimmer 1.6s infinite 0.3s; }
  @keyframes cpdShimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

  /* ══ LINEUP BUILDER MODAL ═══════════════════════════════════════════════ */
  .bldr-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0,0,0,0.82);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 16px 40px;
    overflow-y: auto;
    backdrop-filter: blur(4px);
  }
  .bldr-modal {
    width: 100%;
    max-width: 900px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: calc(100vh - 80px);
  }

  /* Builder header */
  .bldr-head {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 18px 22px;
    background: #0c0c12;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .bldr-head-left  { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .bldr-head-title {
    font-family: 'Bebas Neue', 'Barlow Condensed', sans-serif;
    font-size: 1.5rem; letter-spacing: 0.06em; color: var(--text);
  }
  .bldr-head-contest { font-size: 0.8rem; color: var(--muted); }
  .bldr-head-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
  .bldr-slot-count { font-size: 0.8rem; color: var(--muted); white-space: nowrap; }
  .bldr-close {
    width: 32px; height: 32px; border-radius: 8px;
    background: rgba(255,255,255,0.06); border: 1px solid var(--border);
    color: var(--text); font-size: 0.9rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .bldr-close:hover { background: rgba(255,255,255,0.1); }

  /* Slot pills row */
  .bldr-pills-row {
    display: flex; align-items: center; gap: 8px;
    padding: 14px 22px;
    border-bottom: 1px solid var(--border);
    background: rgba(12,12,18,0.5);
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .bldr-pill {
    width: 34px; height: 34px; border-radius: 8px;
    background: var(--bg-surface2); border: 1px solid var(--border);
    color: var(--muted); font-family: 'Bebas Neue', sans-serif; font-size: 1.05rem;
    cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center;
  }
  .bldr-pill:hover       { border-color: rgba(255,255,255,0.15); color: var(--text); }
  .bldr-pill.bldr-pill-active { background: var(--gold); border-color: var(--gold); color: #0c0c12; }
  .bldr-pill.bldr-pill-filled { border-color: rgba(255,255,255,0.2); color: var(--text); }
  .bldr-pills-count { font-size: 0.75rem; color: var(--muted); margin-left: 6px; }

  /* Selected slots row */
  .bldr-slots-row {
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;
    padding: 14px 22px;
    border-bottom: 1px solid var(--border);
    background: rgba(28,28,44,0.4);
    flex-shrink: 0;
  }
  .bldr-slot {
    position: relative; aspect-ratio: 2/3; border-radius: 8px;
    overflow: hidden; cursor: pointer;
    background-size: cover; background-position: center top;
    transition: transform 0.12s, border-color 0.15s;
  }
  .bldr-slot-empty {
    background: var(--bg-surface2); border: 2px dashed rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
  }
  .bldr-slot-empty:hover { border-color: rgba(200,168,75,0.4); }
  .bldr-slot-active.bldr-slot-empty { border-color: var(--gold); border-width: 2px; background: rgba(200,168,75,0.06); }
  .bldr-slot-active.bldr-slot-filled-bg { outline: 2px solid var(--gold); outline-offset: 2px; }
  .bldr-slot-filled-bg { background-color: var(--bg-surface2); }
  .bldr-slot-num  { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; color: rgba(255,255,255,0.15); }
  .bldr-slot-inner-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%);
    padding: 20px 4px 5px;
  }
  .bldr-slot-inner-name { font-size: 0.55rem; font-weight: 700; color: #fff; line-height: 1.2; padding: 0 4px; display: block; }
  .bldr-slot-remove-btn {
    position: absolute; top: 3px; right: 3px;
    width: 18px; height: 18px; border-radius: 50%;
    background: rgba(230,57,70,0.85); color: #fff; font-size: 0.55rem;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.15s;
  }
  .bldr-slot:hover .bldr-slot-remove-btn { opacity: 1; }

  /* Pool section */
  .bldr-pool-section {
    display: flex; flex-direction: column; gap: 12px;
    padding: 16px 22px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  /* Controls */
  .bldr-controls {
    display: flex; gap: 8px; flex-wrap: wrap;
  }
  .bldr-search {
    flex: 1; min-width: 160px;
    padding: 8px 12px; border-radius: 8px;
    background: var(--bg-surface2); border: 1px solid var(--border);
    color: var(--text); font-size: 0.82rem; font-family: 'DM Sans', sans-serif;
    outline: none; transition: border-color 0.15s;
  }
  .bldr-search:focus { border-color: rgba(255,255,255,0.18); }
  .bldr-search::placeholder { color: var(--muted); }
  .bldr-select {
    padding: 8px 10px; border-radius: 8px; min-width: 130px;
    background: var(--bg-surface2); border: 1px solid var(--border);
    color: var(--text); font-size: 0.78rem; font-family: 'DM Sans', sans-serif;
    cursor: pointer; outline: none;
    appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235a5a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
    padding-right: 28px;
  }

  /* Pool grid */
  .bldr-pool-empty { font-size: 0.85rem; color: var(--muted); text-align: center; padding: 32px 0; }
  .bldr-pool-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;
  }

  /* Pool card (MvpCardTile wrapper) */
  .bldr-card-mvp {
    position: relative; border-radius: 10px; overflow: hidden; cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.12s, border-color 0.15s;
  }
  .bldr-card-mvp:hover                { transform: scale(1.03); border-color: rgba(200,168,75,0.5); }
  .bldr-card-mvp.bldr-card-selected   { border-color: var(--green); }
  .bldr-card-mvp.bldr-card-disabled   { opacity: 0.38; cursor: not-allowed; pointer-events: none; }
  .bldr-card-check-overlay {
    position: absolute; inset: 0; z-index: 50;
    background: rgba(45,181,110,0.4);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.6rem; font-weight: 700; color: #fff;
  }
  .bldr-card-locked-overlay {
    position: absolute; inset: 0; z-index: 50;
    background: rgba(12,12,18,0.65);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 0.06em;
  }

  /* Selected slot using MvpCardTile */
  .bldr-slot-mvp {
    position: relative; border-radius: 8px; overflow: hidden; cursor: pointer;
    transition: transform 0.12s, outline 0.1s;
  }
  .bldr-slot-mvp:hover { transform: scale(1.03); }
  .bldr-slot-mvp.bldr-slot-mvp-active { outline: 2px solid var(--gold); outline-offset: 2px; }

  /* Builder footer */
  .bldr-footer {
    display: flex; flex-direction: column; gap: 10px;
    padding: 14px 22px;
    background: #0c0c12;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .bldr-footer-top  { display: flex; align-items: center; justify-content: space-between; }
  .bldr-footer-info { display: flex; flex-direction: column; gap: 3px; }
  .bldr-footer-count { font-size: 0.85rem; font-weight: 700; color: var(--text); }
  .bldr-footer-validation { font-size: 0.75rem; color: var(--muted); }
  .bldr-footer-flash  { font-size: 0.75rem; color: var(--green); font-weight: 600; }
  .bldr-footer-actions { display: flex; gap: 8px; align-items: center; }
  .bldr-btn-ghost {
    padding: 9px 16px; border-radius: 8px;
    background: transparent; border: 1px solid var(--border);
    color: rgba(255,255,255,0.5); font-size: 0.82rem; font-weight: 600; cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .bldr-btn-ghost:hover    { border-color: rgba(255,255,255,0.18); color: var(--text); }
  .bldr-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
  .bldr-btn-submit-main {
    flex: 1; padding: 11px 24px; border-radius: 8px;
    background: linear-gradient(135deg, #c8a84b, #ecc96a);
    border: none; color: #0c0c12; font-size: 0.92rem; font-weight: 700;
    cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
    font-family: 'DM Sans', sans-serif; letter-spacing: 0.02em;
  }
  .bldr-btn-submit-main:hover    { opacity: 0.88; }
  .bldr-btn-submit-main:disabled { opacity: 0.35; cursor: not-allowed; }
  @keyframes bldrSubmitPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(200,168,75,0); }
    50%       { box-shadow: 0 0 0 8px rgba(200,168,75,0.25); }
  }
  .bldr-btn-pulse { animation: bldrSubmitPulse 2s ease-in-out infinite; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .cpd-topbar { align-items: flex-start; }
    .cpd-topbar-right { gap: 4px; }
    .cpd-status-chip { font-size: 0.62rem; padding: 2px 8px; }
    .cpd-hero { flex-direction: column; align-items: flex-start; padding: 32px 0 24px; }
    .cpd-stat-pills { width: 100%; justify-content: flex-start; }
    .cpd-grid { grid-template-columns: 1fr; }
    .cpd-sidebar { order: 2; }
    .cpd-main   { order: 1; }
    .cpd-slots-grid { grid-template-columns: repeat(3, 1fr); }
    .cpd-slots-grid-5 { grid-template-columns: repeat(6, 1fr); }
    .cpd-slots-grid-5 .cpd-slot                   { grid-column: span 2; }
    .cpd-slots-grid-5 .cpd-slot:nth-child(4)       { grid-column: 2 / span 2; }
    .cpd-slots-grid-5 .cpd-slot:nth-child(5)       { grid-column: 4 / span 2; }
    .cpd-skeleton-body { grid-template-columns: 1fr; }
    .bldr-slots-row { grid-template-columns: repeat(5, 1fr); }
    .bldr-pool-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
  }
  @media (max-width: 480px) {
    .cpd-slots-grid-5 { grid-template-columns: repeat(4, 1fr); }
    .cpd-slots-grid-5 .cpd-slot                   { grid-column: span 2; }
    .cpd-slots-grid-5 .cpd-slot:nth-child(5)       { grid-column: 2 / span 2; }
    .bldr-modal { max-height: 100vh; border-radius: 0; }
    .bldr-overlay { padding: 0; align-items: flex-start; }
  }
`;
