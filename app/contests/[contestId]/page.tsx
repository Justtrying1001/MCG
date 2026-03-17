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
};

type RankingPayload = {
  rankings: Array<{ id: string; userId: string; rank: number; score: number; displayName: string }>;
};

type RewardPayload = {
  hasPolicyData: boolean;
  tiers: Array<{ label: string; bundleName: string; pointsAmount: number; xpAmount: number; packsCount: number }>;
  summary?: {
    pointsPool: number;
    packPool: number;
    rewardedTopPercent: number;
    rewardedWinners: number;
    participantCount: number;
  };
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

type SlotCardView = { card: LineupOption; finalScore: number | null };

function toSlots(roster: string[], rosterSize: number): Array<string | null> {
  const sanitized = roster.slice(0, rosterSize);
  while (sanitized.length < rosterSize) sanitized.push("");
  return sanitized.map((value) => value || null);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCountdown(targetAt: string | null | undefined, nowTs: number): string {
  if (!targetAt) return "--:--:--";
  const diff = new Date(targetAt).getTime() - nowTs;
  if (diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  const { me, loading } = useSession();
  const [detail, setDetail] = useState<ContestDetail | null>(null);
  const [ranking, setRanking] = useState<RankingPayload | null>(null);
  const [rewards, setRewards] = useState<RewardPayload | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [lineupSlots, setLineupSlots] = useState<Array<string | null>>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeBuilderSlot, setActiveBuilderSlot] = useState(0);
  const [error, setError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [builderFlash, setBuilderFlash] = useState("");
  const [builderError, setBuilderError] = useState("");
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownRow[] | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
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

      if (!detailRes.ok) {
        const payload = (await detailRes.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Contest is unavailable or still being prepared.");
        setDetail(null);
        setRanking(null);
        setOptions([]);
        setRewards(null);
        setScoreBreakdown(null);
        return;
      }

      detailPayload = (await detailRes.json()) as ContestDetail;
      setDetail(detailPayload);

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
              setLineupSlots(toSlots((JSON.parse(localDraft) as Array<string | null>).filter(Boolean) as string[], nextRosterSize));
            } else {
              setLineupSlots(toSlots([], nextRosterSize));
            }
          } catch {
            setLineupSlots(toSlots([], nextRosterSize));
          }
        }
      }

      const rankingReq = fetch(`/api/contests/${params.contestId}/ranking`, { cache: "no-store" });
      const rewardsReq = fetch(`/api/contests/${params.contestId}/reward-preview`, { cache: "no-store" });
      const optionsReq = me ? fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" }) : Promise.resolve<Response | null>(null);
      const [rankingRes, rewardsRes, optionsRes] = await Promise.all([rankingReq, rewardsReq, optionsReq]);

      setRanking(rankingRes.ok ? ((await rankingRes.json()) as RankingPayload) : null);
      setRewards(rewardsRes.ok ? ((await rewardsRes.json()) as RewardPayload) : null);
      if (optionsRes?.ok) {
        const payload = (await optionsRes.json().catch(() => null)) as { options?: LineupOption[] } | null;
        setOptions(Array.isArray(payload?.options) ? payload.options : []);
      } else {
        setOptions([]);
      }

      const shouldLoadBreakdown = Boolean(detailPayload.userEntry && detailPayload.contest.status === "SETTLED" && me);
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
    if (lineupSlots.some(Boolean)) return;

    const fallbackLineupIds = scoreBreakdown
      .map((row) => row.cardInstance.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    setLineupSlots(toSlots(fallbackLineupIds, rosterSize));
  }, [contestData?.status, detail?.userEntry, lineupSlots, rosterSize, scoreBreakdown]);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  const duplicateLineupKeys = useMemo(() => {
    const selectedOptions = selectedIds.map((id) => optionById.get(id)).filter((row): row is LineupOption => Boolean(row));
    return findDuplicateLineupIdentityKeys(selectedOptions);
  }, [selectedIds, optionById]);

  const myRanking = useMemo(() => {
    if (!me || !ranking) return null;
    return ranking.rankings.find((row) => row.userId === me.user.id) ?? null;
  }, [me, ranking]);

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
      return {
        card: {
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
          cardView: {
            templateId: id,
            tokenId: "settled",
            displayName: row.cardInstance.cardTemplate.name,
            symbol: row.tokenProject.displayName,
            slug: row.tokenProject.displayName.toLowerCase().replace(/\s+/g, "-"),
            imageUrl: row.cardInstance.cardTemplate.imageUrl,
            primaryChain: null,
            faction: null,
            rarity: row.cardInstance.cardTemplate.rarity?.code ?? "COMMON",
            edition: row.cardInstance.cardTemplate.edition?.code ?? "BASE",
            plannedSupply: 0,
            issuedSupply: 0,
            remainingSupply: 0,
            owned: true,
            instanceCount: 1,
            setCode: "SETTLED",
            setEditionLabel: "Settled lineup",
            setOrder: 0,
            editionNumber: 0,
          },
        },
        finalScore: row.finalScore,
      };
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
    setBuilderFlash(isDraft ? "Draft saved." : "Lineup submitted successfully.");
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
        const selectedTokenKey = getLogicalTokenKey({ tokenProjectId: selectedOption.tokenProjectId, cardTemplateId: selectedOption.cardTemplateId });
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
      if (existingIndex >= 0) next[existingIndex] = null;

      if (targetIndex >= 0 && targetIndex < rosterSize) {
        next[targetIndex] = instanceId;
        return next;
      }
      const emptyIndex = next.findIndex((value) => value === null);
      if (emptyIndex >= 0) next[emptyIndex] = instanceId;
      return next;
    });
  };

  const status = contestData?.status;
  const isOpen = status === "OPEN";
  const isLocked = status === "LOCKED";
  const isLive = status === "LIVE";
  const isSettled = status === "SETTLED";

  if (!hasAttemptedLoad || isLoadingPage || (loading && !detail)) {
    return (
      <SiteShell>
        <section className="contest-command-loading" aria-label="Loading contest detail">
          <div className="contest-command-skeleton-lg" />
          <div className="contest-command-skeleton-md" />
          <div className="contest-command-skeleton-grid">
            <div className="contest-command-skeleton-col" />
            <div className="contest-command-skeleton-col" />
          </div>
        </section>
      </SiteShell>
    );
  }

  if (!detail || !contestData) {
    return (
      <SiteShell>
        <section className="contest-command-empty">
          <h1>Contest unavailable</h1>
          <p>{error || "This contest is currently unavailable. Please try again in a few moments."}</p>
        </section>
      </SiteShell>
    );
  }

  const contest = detail.contest;
  const entryFee = rule?.entryFeeEnabled ? `${rule.entryFeeAmount ?? 0} pts` : "Free";
  const countdownTarget = isOpen ? contest.lockAt : contest.endsAt;
  const countdownLabel = isOpen ? "Lineup lock in" : isSettled ? "Finished" : "Contest ends in";

  const lifecycleSteps = [
    { key: "open", label: "Registration open", date: contest.openAt ? fmtDate(contest.openAt) : "Open", active: isOpen, done: isLocked || isLive || isSettled },
    { key: "lock", label: "Lineup lock", date: fmtDate(contest.lockAt), active: isLocked, done: isLive || isSettled },
    { key: "live", label: "Live contest", date: fmtDate(contest.liveAt ?? contest.lockAt), active: isLive, done: isSettled },
    { key: "settled", label: "Settled", date: fmtDate(contest.endsAt), active: isSettled, done: isSettled },
  ];

  const lineupStateText = !me
    ? "Sign in to build and submit a lineup."
    : isSettled
      ? "Contest settled. Review your final lineup scores below."
      : isLocked || isLive
        ? "Lineup locked. Your submitted cards are now final."
        : hasEntry
          ? "Your lineup is submitted. You can still edit until lock."
          : selectedIds.length > 0
            ? "Draft in progress. Complete and submit before lock."
            : "No lineup submitted yet.";

  const summaryLine = `${rosterSize} cards • ${entryFee} • ${contest.seasonName ?? "Open league"} • ${contest._count.entries} participants`;
  const rankingRows = ranking?.rankings ?? [];
  const topThree = rankingRows.slice(0, 3);

  return (
    <SiteShell>
      <div className="contest-command-page">
        <div className="contest-command-statusbar">
          <div className="contest-command-status-left">
            <span className="contest-command-code">{contest.code}</span>
            <span className={`mcg-badge ${isOpen ? "open" : isLive ? "live" : isLocked ? "locked" : "settled"}`}>{contest.status}</span>
            {contest.seasonName ? <span className="mcg-chip">{contest.seasonName}</span> : null}
            {contest.leagueTierRequired ? <span className="mcg-chip">{contest.leagueTierRequired}</span> : null}
          </div>
          <div className="contest-command-status-right">
            <span>{countdownLabel}</span>
            <strong>{isSettled ? "Finalized" : formatCountdown(countdownTarget, nowTs)}</strong>
          </div>
        </div>

        <header className="contest-command-hero mcg-surface raised">
          <div>
            <p className="mcg-eyebrow">Contest command center</p>
            <h1>{contest.title}</h1>
            <p className="contest-command-subline">{contest.code} · {summaryLine}</p>
          </div>
          <div className="contest-command-stat-grid">
            <article><span>Participants</span><strong>{contest._count.entries}</strong></article>
            <article><span>Your rank</span><strong>{myRanking ? `#${myRanking.rank}` : "—"}</strong></article>
            <article><span>Your score</span><strong>{myRanking ? myRanking.score.toFixed(2) : "—"}</strong></article>
            <article><span>Lineup size</span><strong>{rosterSize} cards</strong></article>
          </div>
        </header>

        <section className="contest-command-lifecycle" aria-label="Contest lifecycle">
          {lifecycleSteps.map((step) => (
            <article key={step.key} className={`contest-command-lifecycle-step ${step.active ? "active" : ""} ${step.done ? "done" : ""}`}>
              <span>{step.label}</span>
              <strong>{step.date}</strong>
            </article>
          ))}
        </section>

        {error ? <div className="contest-command-banner warn">{error}</div> : null}
        {builderError ? <div className="contest-command-banner warn">{builderError}</div> : null}
        {builderFlash && !showBuilder ? <div className="contest-command-banner success">{builderFlash}</div> : null}

        <section className="contest-command-entry-card mcg-surface">
          <div>
            <h2>Your entry state</h2>
            <p>{lineupStateText}</p>
          </div>
          <div className="contest-command-entry-cta">
            {!me ? <button type="button" className="mcg-btn ghost" disabled>Sign in required</button> : null}
            {me && isOpen ? (
              <button
                type="button"
                className="mcg-btn primary"
                onClick={() => {
                  const firstEmpty = lineupSlots.findIndex((slot) => !slot);
                  setActiveBuilderSlot(firstEmpty >= 0 ? firstEmpty : 0);
                  setShowBuilder(true);
                  setBuilderFlash("");
                }}
              >
                {hasEntry ? "Edit lineup" : selectedIds.length > 0 ? "Continue lineup" : "Build lineup"}
              </button>
            ) : null}
            {(isLocked || isLive) ? <span className="mcg-chip">Lineup locked</span> : null}
            {isSettled ? <span className="mcg-chip selected">Contest finished</span> : null}
          </div>
        </section>

        <div className="contest-command-layout">
          <main className="contest-command-main">
            <section className="contest-command-board mcg-surface raised">
              <div className="contest-command-board-head">
                <div>
                  <h2>Your lineup preview</h2>
                  <p>Manage your lineup in the builder popup. Preview remains read-first in the lobby.</p>
                </div>
                {isOpen ? (
                  <button
                    type="button"
                    className="mcg-btn primary"
                    onClick={() => {
                      const firstEmpty = lineupSlots.findIndex((slot) => !slot);
                      setActiveBuilderSlot(firstEmpty >= 0 ? firstEmpty : 0);
                      setShowBuilder(true);
                    }}
                  >
                    {hasEntry ? "Open lineup builder" : "Build lineup"}
                  </button>
                ) : <span className={`mcg-badge ${isOpen ? "open" : isLive ? "live" : isLocked ? "locked" : "settled"}`}>{contest.status}</span>}
              </div>

              <div className={`contest-command-slot-grid slots-${rosterSize}`}>
                {Array.from({ length: rosterSize }).map((_, index) => {
                  const slotCard = slotCards[index];
                  if (!slotCard) {
                    return (
                      <button
                        key={index}
                        type="button"
                        className="contest-command-slot empty"
                        onClick={() => {
                          if (!isOpen) return;
                          setActiveBuilderSlot(index);
                          setShowBuilder(true);
                        }}
                        disabled={!isOpen}
                        aria-label={`Slot ${index + 1} empty`}
                      >
                        <span>Slot {index + 1}</span>
                        <strong>Add card</strong>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={index}
                      type="button"
                      className="contest-command-slot filled"
                      onClick={() => {
                        if (!isOpen) return;
                        setActiveBuilderSlot(index);
                        setShowBuilder(true);
                      }}
                      disabled={!isOpen}
                      aria-label={`Slot ${index + 1} ${slotCard.card.name}`}
                    >
                      {(() => {
                        const cardView = toMvpCardView(slotCard.card);
                        if (!cardView) return <span className="contest-command-slot-missing">Card preview unavailable</span>;
                        return <MvpCardTile card={cardView} variant="canonical" interactive={false} />;
                      })()}
                      {(isLocked || isLive) ? <span className="contest-command-slot-overlay">Locked</span> : null}
                      {isSettled ? <span className="contest-command-score-chip">{slotCard.finalScore !== null ? `${slotCard.finalScore.toFixed(2)} pts` : "—"}</span> : null}
                    </button>
                  );
                })}
              </div>

              <div className="contest-command-board-foot">
                <span>{selectedIds.length}/{rosterSize} cards selected</span>
                {duplicateLineupKeys.length > 0 ? <span className="warn">Duplicate token conflict detected.</span> : null}
                {(isLocked || isLive) ? <span>Lineup is locked.</span> : null}
                {detail.userEntry?.status === "SUBMITTED" && !isSettled ? <span className="ok">Lineup submitted.</span> : null}
              </div>
            </section>

            <section className="contest-command-leaderboard mcg-surface">
              <div className="contest-command-section-head">
                <h2>Leaderboard</h2>
                <span>{rankingRows.length} entries</span>
              </div>

              {rankingRows.length === 0 ? <p className="contest-command-empty-mini">No entries yet.</p> : (
                <>
                  <div className="contest-command-podium">
                    {topThree.map((row) => (
                      <article key={row.id} className={`podium-card rank-${row.rank}`}>
                        <span>#{row.rank}</span>
                        <strong>{row.displayName}</strong>
                        <b>{row.score.toFixed(2)}</b>
                      </article>
                    ))}
                  </div>
                  <div className="contest-command-rank-list">
                    {rankingRows.map((row) => (
                      <div key={row.id} className={`rank-row ${row.userId === me?.user.id ? "mine" : ""} ${row.rank <= 3 ? "top" : ""}`}>
                        <span className="mono">#{row.rank}</span>
                        <span>{row.displayName}</span>
                        <strong className="mono">{row.score.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </main>

          <aside className="contest-command-side">
            <section className="mcg-surface contest-command-panel">
              <h3>Rewards</h3>
              <div className="contest-command-rewards">
                {(rewards?.tiers ?? []).map((tier, index) => (
                  <article key={`${tier.label}-${index}`} className={index === 0 ? "first" : ""}>
                    <header><strong>{tier.label}</strong>{tier.bundleName ? <span>{tier.bundleName}</span> : null}</header>
                    <div>
                      {tier.pointsAmount > 0 ? <span>{tier.pointsAmount} pts</span> : null}
                      {tier.xpAmount > 0 ? <span>{tier.xpAmount} XP</span> : null}
                      {tier.packsCount > 0 ? <span>{tier.packsCount} pack{tier.packsCount > 1 ? "s" : ""}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mcg-surface contest-command-panel">
              <h3>Contest info</h3>
              <dl className="contest-command-info-list">
                <div><dt>Lineup size</dt><dd>{rosterSize} cards</dd></div>
                <div><dt>Entry fee</dt><dd>{entryFee}</dd></div>
                <div><dt>League / season</dt><dd>{contest.seasonName ?? "Open"}</dd></div>
                <div><dt>Participants</dt><dd>{contest._count.entries}</dd></div>
                <div><dt>Contest code</dt><dd className="mono">{contest.code}</dd></div>
                <div><dt>Lock date</dt><dd>{fmtDate(contest.lockAt)}</dd></div>
                <div><dt>End date</dt><dd>{fmtDate(contest.endsAt)}</dd></div>
              </dl>
            </section>

            <section className="mcg-surface contest-command-panel">
              <h3>Schedule</h3>
              <div className="contest-command-timeline">
                {lifecycleSteps.map((step) => (
                  <article key={step.key} className={step.active ? "active" : ""}>
                    <strong>{step.label}</strong>
                    <span>{step.date}</span>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <LineupBuilderModal
        open={showBuilder}
        contestTitle={contest.title}
        contestCode={contest.code}
        contestStatus={contest.status}
        lockAt={contest.lockAt}
        rosterSize={rosterSize}
        initialActiveSlot={activeBuilderSlot}
        lineupSlots={lineupSlots.length === rosterSize ? lineupSlots : toSlots(selectedIds, rosterSize)}
        options={options}
        selectedLogicalTokenKeys={selectedLogicalTokenKeys}
        busy={submitBusy}
        flashMessage={builderFlash}
        errorMessage={builderError}
        submitLabel={hasEntry ? "Update lineup" : "Submit lineup"}
        onClose={() => setShowBuilder(false)}
        onSelectSlot={(slot) => setActiveBuilderSlot(slot)}
        onSelectCard={handleSelectCard}
        onRemoveSlot={(slotIndex) => {
          if (!canManageLineup) return;
          setBuilderError("");
          setLineupSlots((prev) => {
            const next = [...prev];
            next[slotIndex] = null;
            return next;
          });
        }}
        onSaveDraft={async () => {
          if (selectedIds.length === rosterSize) {
            await submitLineup(true);
          } else {
            try { localStorage.setItem(`lineup-draft-${params.contestId}`, JSON.stringify(lineupSlots)); } catch {}
            setBuilderFlash("Draft saved.");
            setShowBuilder(false);
          }
        }}
        onSubmit={() => void submitLineup()}
      />

      <style jsx>{`
        .contest-command-statusbar {
          position: sticky;
          top: var(--nav-h);
          z-index: 90;
        }
      `}</style>
    </SiteShell>
  );
}
