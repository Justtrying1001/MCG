"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { CardSelectorModal } from "@/components/contests/CardSelectorModal";
import { RulesDrawer } from "@/components/contests/RulesDrawer";
import { loadContestCache } from "@/components/contests/contestUtils";
import type { ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";
import { useSession } from "@/components/useSession";
import type { MvpCollectionItem } from "@/types/cards";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  rewardGrants?: Array<{
    id: string;
    type: "POINTS" | "PACK" | "CARD_INSTANCE";
    amount: number | null;
    packDefinitionId: string | null;
    createdAt: string;
  }>;
};

type RankingPayload = {
  rankings: Array<{
    id: string;
    userId: string;
    rank: number;
    score: number;
    user: { displayName: string; xUsername: string };
  }>;
};

type MyRewardsPayload = { pointsTotal: number; xpTotal: number; packsTotal: number };
type RewardTier = { label: string; bundleName: string; pointsAmount: number; xpAmount: number; packsCount: number };
type RewardPreviewPayload = { hasPolicyData: boolean; tiers: RewardTier[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const [myRewards, setMyRewards] = useState<MyRewardsPayload | null>(null);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[] | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "saving">("idle");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());

  // Countdown tick
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

    if (rankingRes.ok) setRanking((await rankingRes.json()) as RankingPayload);
    if (optionsRes.ok) {
      const payload = (await optionsRes.json().catch(() => null)) as { options?: LineupOption[] } | null;
      setOptions(Array.isArray(payload?.options) ? payload.options : []);
    }
  }, [params.contestId]);

  useEffect(() => {
    if (loading) return;
    void (async () => {
      setError("");
      const [detailRes, rankingRes, optionsRes, rewardsRes, rewardPreviewRes] = await Promise.all([
        fetch(`/api/contests/${params.contestId}`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/ranking`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/lineup-options`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/my-rewards`, { cache: "no-store" }),
        fetch(`/api/contests/${params.contestId}/reward-preview`, { cache: "no-store" }),
      ]);

      if (!detailRes.ok) {
        const cached = loadContestCache().find((c) => c.id === params.contestId);
        if (cached) {
          setDetail({ contest: cached, userEntry: null });
          setRanking({ rankings: [] });
          setError("Showing cached contest data. Connect with X for live updates.");
        } else {
          setError((await detailRes.text()) || "Cannot load contest detail");
        }
      } else {
        const d = (await detailRes.json()) as ContestDetail;
        setDetail(d);
        if (d.userEntry) {
          setSelected(d.userEntry.rosterLocks.map((lock) => lock.ownedCardInstanceId));
        }
      }

      if (rankingRes.ok) setRanking((await rankingRes.json()) as RankingPayload);
      if (rewardsRes.ok) setMyRewards((await rewardsRes.json()) as MyRewardsPayload);
      if (rewardPreviewRes.ok) {
        const rp = (await rewardPreviewRes.json()) as RewardPreviewPayload;
        if (rp.hasPolicyData) setRewardTiers(rp.tiers);
      }
      if (optionsRes.ok) {
        const lp = (await optionsRes.json()) as { options: LineupOption[] };
        setOptions(lp.options ?? []);
      } else if (me?.mode === "guest") {
        setOptions(mapGuestCollectionToOptions(me.mvpCollection));
      }
    })();
  }, [loading, me, params.contestId]);

  const rule = detail?.contest.rules[0];
  const maxRosterSize = rule?.maxRosterSize ?? 5;
  const isGuest = !loading && me?.mode === "guest";
  const canManageLineup = detail?.contest.status === "OPEN";
  const canEnter = Boolean(canManageLineup) && !isGuest;

  const filteredOptions = useMemo(
    () => (rule?.cardSetId ? options.filter((o) => o.cardSetId === rule.cardSetId) : options),
    [options, rule?.cardSetId],
  );

  const contest = detail?.contest;
  const rule = contest?.rules[0];
  const rosterSize = rule?.maxRosterSize ?? 5;
  const selectedCards = useMemo(
    () =>
      Array.from({ length: maxRosterSize }).map((_, i) =>
        filteredOptions.find((o) => o.instanceId === selected[i]) ?? null,
      ),
    [filteredOptions, maxRosterSize, selected],
  );

  const myRankingRow = ranking?.rankings?.find((r) => r.userId === me?.user.id) ?? null;
  const filledCount = selected.filter(Boolean).length;

  const countdownTarget = useMemo(() => {
    if (!contest) return null;
    if (contest.status === "OPEN" && contest.lockAt) return new Date(contest.lockAt).getTime();
    if ((contest.status === "LOCKED" || contest.status === "LIVE") && contest.endsAt) return new Date(contest.endsAt).getTime();
    return null;
  }, [detail]);

  const toggle = (instanceId: string) => {
    if (!canManageLineup) return;
    setSelected((prev) => {
      if (activeSlot !== null) {
        const next = [...prev];
        const idx = next.indexOf(instanceId);
        if (idx >= 0) next.splice(idx, 1);
        next[activeSlot] = instanceId;
        return next.filter(Boolean).slice(0, maxRosterSize);
      }
      if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
      if (prev.length >= maxRosterSize) return prev;
      return [...prev, instanceId];
    });
  };

  const removeFromSlot = (slot: number) => {
    if (!canManageLineup) return;
    setSelected((prev) => prev.filter((_, i) => i !== slot));
  };

  const handleSlotClick = (slotIndex: number) => {
    if (!canManageLineup) return;
    if (selectedCards[slotIndex]) {
      removeFromSlot(slotIndex);
    } else {
      setActiveSlot(slotIndex);
      setShowModal(true);
    }
  };

  const openModal = () => {
    const firstEmpty = selectedCards.findIndex((c) => c === null);
    setActiveSlot(firstEmpty >= 0 ? firstEmpty : 0);
    setShowModal(true);
  };

  const submitEntry = async () => {
    if (!detail || !canEnter || filledCount !== maxRosterSize) return;
    setSubmitState("saving");
    setError("");
    const res = await fetch(`/api/contests/${params.contestId}/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineupInstanceIds: selected }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Contest entry failed");
      setSubmitState("idle");
      return;
    }
    const updated = await fetch(`/api/contests/${params.contestId}`, { cache: "no-store" });
    if (updated.ok) setDetail((await updated.json()) as ContestDetail);
    setSubmitState("idle");
  };

  if (!me && !loading) {
    return (
      <SiteShell>
        <p className="mcg-eyebrow">Connect with X to access contest details.</p>
      </SiteShell>
    );
  }

  const contest = detail.contest;
  const status = contest.status;
  const isOpen = status === "OPEN";
  const isLocked = status === "LOCKED";
  const isLive = status === "LIVE";
  const isSettled = status === "SETTLED";

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

  const rewardPoints = Math.max(100, maxRosterSize * 40);
  const fieldTier = contest._count.entries >= 100 ? "High" : contest._count.entries >= 30 ? "Mid" : "Early";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SiteShell>
      <style>{CSS}</style>

      {/* ── Sticky contest topbar ── */}
      <div className="cpd-topbar">
        <div className="cpd-topbar-left">
          {isOpen && <span className="cpd-dot-live" aria-hidden="true" />}
          <span className="cpd-topbar-name">{contest.title}</span>
          {contest.leagueTierRequired && (
            <span className="cpd-league-badge">{contest.leagueTierRequired}</span>
          )}
        </div>
        <div className="cpd-topbar-right">
          {countdownTarget !== null ? (
            <>
              <span className="cpd-topbar-label">
                {isOpen ? "Lock in" : isLive ? "Ends in" : "Locked"}
              </span>
              <span className="cpd-countdown">{fmtCountdown(countdownTarget, nowTs)}</span>
            </>
          ) : (
            <span className="cpd-status-chip" data-status={status}>{status}</span>
          )}
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="cpd-hero">
        <div className="cpd-hero-left">
          <p className="cpd-hero-eyebrow">{contest.seasonName ?? "Season"}</p>
          <h1 className="cpd-hero-title">{contest.code.toUpperCase()}</h1>
          <p className="cpd-hero-subtitle">{contest.title}</p>
        </div>
        <div className="cpd-hero-right">
          <div className="cpd-stat-pills">
            <div className="cpd-stat-pill">
              <span className="cpd-stat-label">Participants</span>
              <strong className="cpd-stat-value">{contest._count.entries}</strong>
            </div>
            <div className="cpd-stat-pill">
              <span className="cpd-stat-label">Your rank</span>
              <strong className="cpd-stat-value cpd-stat-gold">
                {myRankingRow ? `#${myRankingRow.rank}` : "—"}
              </strong>
            </div>
            <div className="cpd-stat-pill">
              <span className="cpd-stat-label">Your score</span>
              <strong className="cpd-stat-value cpd-stat-gold">
                {myRankingRow ? myRankingRow.score.toFixed(2) : "—"}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── Banners ── */}
      {error && <div className="cpd-banner cpd-banner-warn" role="alert">{error}</div>}
      {isGuest && (
        <div className="cpd-banner cpd-banner-info">
          Guest preview — connect with X to submit a lineup and appear on the leaderboard.
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="cpd-grid">

        {/* ── Left column ── */}
        <main className="cpd-main">

          {/* ── Lineup block ── */}
          <section className={`cpd-block${!canManageLineup ? " cpd-block-locked" : ""}`}>
            <div className="cpd-block-header">
              <div>
                <div className="cpd-lineup-title-row">
                  <h2 className="cpd-block-title">Your Lineup</h2>
                  {isLocked && <span className="cpd-status-badge cpd-badge-locked">🔒 Locked</span>}
                  {isLive && <span className="cpd-status-badge cpd-badge-live">● Live</span>}
                  {isSettled && <span className="cpd-status-badge cpd-badge-settled">✓ Finished</span>}
                </div>
                <span className="cpd-block-meta">{filledCount}/{maxRosterSize} slots filled</span>
              </div>
              <div className="cpd-lineup-actions">
                {canManageLineup && (
                  <button type="button" className="cpd-btn-gold" onClick={openModal}>
                    Build Lineup
                  </button>
                )}
                {canEnter && filledCount === maxRosterSize && !detail.userEntry && (
                  <button
                    type="button"
                    className="cpd-btn-submit"
                    disabled={submitState === "saving"}
                    onClick={() => void submitEntry()}
                  >
                    {submitState === "saving" ? "Saving…" : "Submit Entry"}
                  </button>
                )}
              </div>
            </div>

            <div className={`cpd-slots-grid${maxRosterSize === 5 ? " cpd-slots-grid-5" : ""}`}>
              {selectedCards.map((card, slotIndex) => (
                <button
                  key={slotIndex}
                  type="button"
                  disabled={!canManageLineup}
                  className={[
                    "cpd-slot",
                    card ? "cpd-slot-filled" : "cpd-slot-empty",
                    canManageLineup ? "cpd-slot-interactive" : "",
                    !canManageLineup && !card ? "cpd-slot-locked-empty" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => handleSlotClick(slotIndex)}
                  title={
                    canManageLineup
                      ? card
                        ? `Slot ${slotIndex + 1}: ${card.name} — click to remove`
                        : `Slot ${slotIndex + 1}: empty — click to add`
                      : card
                      ? `Slot ${slotIndex + 1}: ${card.name}`
                      : `Slot ${slotIndex + 1}: empty`
                  }
                >
                  {card ? (
                    <>
                      {card.imageUrl ? (
                        <img className="cpd-slot-img" src={card.imageUrl} alt={card.name} loading="lazy" />
                      ) : (
                        <div className="cpd-slot-img-placeholder">
                          {card.tokenProjectName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="cpd-slot-info">
                        <strong className="cpd-slot-name">{card.name}</strong>
                        <span
                          className="cpd-slot-rarity"
                          style={{ color: RARITY_COLOR[card.rarityCode.toUpperCase()] ?? "#6b7280" }}
                        >
                          {card.rarityCode}
                        </span>
                      </div>
                      {canManageLineup && <span className="cpd-slot-remove" aria-hidden="true">✕</span>}
                    </>
                  ) : (
                    <>
                      <span className="cpd-slot-number">{slotIndex + 1}</span>
                      {canManageLineup && <span className="cpd-slot-add-hint">+ Add</span>}
                    </>
                  )}
                </button>
              ))}
            </div>

            {detail.userEntry && (
              <p className="cpd-lineup-submitted">
                ✓ Lineup submitted · Entry #{detail.userEntry.id.slice(-6).toUpperCase()}
              </p>
            )}
          </section>

          {/* ── Settled result block ── */}
          {isSettled && myRankingRow && (
            <section className="cpd-block cpd-block-settled">
              <div className="cpd-settled-header">
                <span className="cpd-settled-icon">🏆</span>
                <div>
                  <h2 className="cpd-block-title">Final Result</h2>
                  <span className="cpd-block-meta">Contest finished</span>
                </div>
              </div>
              <div className="cpd-settled-stats">
                <div className="cpd-settled-stat">
                  <span>Final rank</span>
                  <strong className="cpd-stat-gold">#{myRankingRow.rank}</strong>
                </div>
                <div className="cpd-settled-stat">
                  <span>Score</span>
                  <strong>{myRankingRow.score.toFixed(2)}</strong>
                </div>
                {myRewards && (myRewards.pointsTotal > 0 || myRewards.xpTotal > 0 || myRewards.packsTotal > 0) && (
                  <div className="cpd-settled-stat">
                    <span>Rewards</span>
                    <strong className="cpd-reward-gold">
                      {[
                        myRewards.pointsTotal > 0 ? `${myRewards.pointsTotal} pts` : null,
                        myRewards.xpTotal > 0 ? `+${myRewards.xpTotal} XP` : null,
                        myRewards.packsTotal > 0 ? `${myRewards.packsTotal} pack${myRewards.packsTotal > 1 ? "s" : ""}` : null,
                      ].filter(Boolean).join(" · ")}
                    </strong>
                  </div>
                )}
              </div>
              <p className="cpd-settled-note">
                Rewards are granted during settlement processing. Your cards are unlocked once the contest is settled.
              </p>
            </section>
          )}

          {/* ── Leaderboard block ── */}
          <section className="cpd-block">
            <div className="cpd-block-header">
              <h2 className="cpd-block-title">Leaderboard</h2>
              <span className="cpd-block-meta">{contest._count.entries} entries</span>
            </div>
            {!ranking || ranking.rankings.length === 0 ? (
              <p className="cpd-empty-msg">No entries yet — be the first to join.</p>
            ) : (
              <div className="cpd-leaderboard">
                {ranking.rankings.slice(0, 20).map((row) => {
                  const isMe = row.userId === me?.user.id;
                  const name =
                    row.user.displayName?.trim() ||
                    (row.user.xUsername ? `@${row.user.xUsername}` : `Player #${row.rank}`);
                  return (
                    <div
                      key={row.id}
                      className={[
                        "cpd-lb-row",
                        isMe ? "cpd-lb-row-me" : "",
                        row.rank <= 3 ? "cpd-lb-row-top" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <span className="cpd-lb-rank">
                        {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`}
                      </span>
                      <span className="cpd-lb-name">{isMe ? "You" : name}</span>
                      <strong className="cpd-lb-score">{row.score.toFixed(2)}</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </main>

        {/* ── Sidebar ── */}
        <aside className="cpd-sidebar">

          {/* Rewards */}
          <section className="cpd-block">
            <h2 className="cpd-block-title">Rewards</h2>
            <div className="cpd-rewards-list">
              {(rewardTiers && rewardTiers.length > 0 ? rewardTiers : [
                { label: "Rank #1", pointsAmount: rewardPoints, xpAmount: 0, packsCount: 0, bundleName: "", },
                { label: "Top 3",   pointsAmount: Math.round(rewardPoints * 0.6), xpAmount: 0, packsCount: 0, bundleName: "", },
                { label: "Top 10",  pointsAmount: Math.round(rewardPoints * 0.3), xpAmount: 0, packsCount: 0, bundleName: "", },
              ]).map((tier, i) => (
                <div key={i} className={`cpd-reward-row${i === 0 ? " cpd-reward-row-first" : ""}`}>
                  <span className="cpd-reward-label">{tier.label}</span>
                  <div className="cpd-reward-amounts">
                    {tier.pointsAmount > 0 && (
                      <strong className={i === 0 ? "cpd-reward-gold" : ""}>{tier.pointsAmount} pts</strong>
                    )}
                    {tier.xpAmount > 0 && <span>+{tier.xpAmount} XP</span>}
                    {tier.packsCount > 0 && (
                      <span>{tier.packsCount} pack{tier.packsCount > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Info */}
          <section className="cpd-block">
            <h2 className="cpd-block-title">Info</h2>
            <dl className="cpd-info-grid">
              <dt>Lineup size</dt><dd>{maxRosterSize} cards</dd>
              <dt>Entry</dt><dd>Free</dd>
              <dt>League</dt><dd>{contest.leagueTierRequired ?? "Open"}</dd>
              <dt>Field tier</dt><dd>{fieldTier}</dd>
              <dt>Code</dt><dd className="cpd-mono">{contest.code}</dd>
            </dl>
            <button type="button" className="cpd-btn-ghost" onClick={() => setRulesOpen(true)}>
              View rules
            </button>
          </section>

          {/* Schedule */}
          <section className="cpd-block">
            <h2 className="cpd-block-title">Schedule</h2>
            <div className="cpd-schedule">
              {scheduleSteps.map((step) => (
                <div
                  key={step.key}
                  className={[
                    "cpd-schedule-step",
                    step.active ? "cpd-step-active" : "",
                    step.done ? "cpd-step-done" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <div className="cpd-step-indicator">
                    <span
                      className={[
                        "cpd-step-dot",
                        step.done ? "cpd-step-dot-done" : step.active ? "cpd-step-dot-live" : "cpd-step-dot-pending",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    <div className="cpd-step-line" aria-hidden="true" />
                  </div>
                  <div className="cpd-step-content">
                    <p className="cpd-step-label">{step.label}</p>
                    <p className="cpd-step-date">{step.date}</p>
                  </div>
                </div>
              ))}
            </div>
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
        onClose={() => { setShowModal(false); setActiveSlot(null); }}
        canEnter={canEnter}
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

// ─── Embedded styles ──────────────────────────────────────────────────────────

const CSS = `
  /* ── Fonts ── */
  .cpd-hero-title,
  .cpd-block-title { font-family: 'Bebas Neue', 'Barlow Condensed', 'Rajdhani', sans-serif; }

  /* ── Topbar ── */
  .cpd-topbar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    margin-bottom: 4px;
    background: rgba(12, 12, 18, 0.96);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .cpd-topbar-left  { display: flex; align-items: center; gap: 10px; }
  .cpd-topbar-right { display: flex; align-items: center; gap: 8px; }
  .cpd-topbar-name  { font-size: 0.9rem; font-weight: 600; color: #e0e0e8; }
  .cpd-topbar-label { font-size: 0.72rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.06em; }
  .cpd-countdown {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.05rem;
    font-weight: 700;
    color: #ecc96a;
    letter-spacing: 0.04em;
  }
  .cpd-league-badge {
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    padding: 2px 8px; border-radius: 20px;
    background: rgba(200,168,75,0.15); border: 1px solid rgba(200,168,75,0.35); color: #c8a84b;
  }
  .cpd-status-chip {
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
    padding: 3px 10px; border-radius: 20px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.6);
  }
  .cpd-status-chip[data-status="SETTLED"] { color:#2db56e; border-color:rgba(45,181,110,.3); background:rgba(45,181,110,.08); }
  .cpd-status-chip[data-status="LIVE"]    { color:#ecc96a; border-color:rgba(236,201,106,.3); background:rgba(236,201,106,.08); }

  /* Live dot */
  .cpd-dot-live {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    background: #2db56e; flex-shrink: 0;
    animation: cpdPulse 1.8s ease-in-out infinite;
  }
  @keyframes cpdPulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:.4; transform:scale(.8); }
  }

  /* ── Hero ── */
  .cpd-hero {
    display: grid; grid-template-columns: 1fr auto; align-items: center;
    gap: 24px; padding: 28px 0 20px;
    border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 24px;
  }
  .cpd-hero-eyebrow { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:rgba(255,255,255,.35); margin:0 0 6px; }
  .cpd-hero-title   { font-size: clamp(2.8rem,6vw,5rem); line-height:.9; letter-spacing:.02em; color:#fff; margin:0 0 6px; }
  .cpd-hero-subtitle{ font-size:.9rem; color:rgba(255,255,255,.5); margin:0; }
  .cpd-stat-pills   { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
  .cpd-stat-pill {
    display:flex; flex-direction:column; align-items:center; gap:3px;
    padding:10px 18px; min-width:80px;
    background:#141420; border:1px solid rgba(255,255,255,.07); border-radius:12px;
  }
  .cpd-stat-label { font-size:.65rem; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:rgba(255,255,255,.4); white-space:nowrap; }
  .cpd-stat-value { font-size:1.25rem; font-weight:700; color:#e0e0e8; line-height:1; }
  .cpd-stat-gold  { color:#ecc96a; }

  /* ── Banners ── */
  .cpd-banner { padding:10px 14px; border-radius:10px; font-size:.85rem; margin-bottom:16px; }
  .cpd-banner-warn { background:rgba(214,58,50,.1); border:1px solid rgba(214,58,50,.25); color:#f87171; }
  .cpd-banner-info { background:rgba(200,168,75,.08); border:1px solid rgba(200,168,75,.2); color:#c8a84b; }

  /* ── Grid ── */
  .cpd-grid { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:20px; align-items:start; }

  /* ── Shared block ── */
  .cpd-block {
    background:#141420; border:1px solid rgba(255,255,255,.07);
    border-radius:14px; padding:20px; margin-bottom:16px;
  }
  .cpd-block-header {
    display:flex; align-items:flex-start; justify-content:space-between;
    gap:12px; margin-bottom:16px; flex-wrap:wrap;
  }
  .cpd-block-title { font-size:1.2rem; letter-spacing:.04em; color:#e0e0e8; margin:0; line-height:1.1; }
  .cpd-block-meta  { font-size:.75rem; color:rgba(255,255,255,.35); margin:3px 0 0; }
  .cpd-empty-msg   { font-size:.85rem; color:rgba(255,255,255,.35); text-align:center; padding:24px 0; margin:0; }

  /* ── Lineup status badges ── */
  .cpd-lineup-title-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .cpd-status-badge {
    display:inline-flex; align-items:center; gap:4px; padding:2px 10px;
    border-radius:20px; font-size:.68rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase;
  }
  .cpd-badge-locked { background:rgba(255,200,0,.08);  border:1px solid rgba(255,200,0,.25);  color:#f5c842; }
  .cpd-badge-live   { background:rgba(45,181,110,.1);  border:1px solid rgba(45,181,110,.3);  color:#2db56e; }
  .cpd-badge-settled{ background:rgba(200,168,75,.1);  border:1px solid rgba(200,168,75,.3);  color:#c8a84b; }
  .cpd-block-locked { opacity:.9; }
  .cpd-slot-locked-empty { border-color:rgba(255,255,255,.07)!important; cursor:not-allowed; opacity:.45; }

  /* ── Lineup actions ── */
  .cpd-lineup-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .cpd-btn-gold {
    display:inline-flex; align-items:center; padding:8px 18px;
    border:none; border-radius:8px;
    background:linear-gradient(135deg,#c8a84b,#ecc96a); color:#0c0c12;
    font-size:.82rem; font-weight:700; letter-spacing:.04em;
    cursor:pointer; transition:opacity .15s;
  }
  .cpd-btn-gold:hover { opacity:.85; }
  .cpd-btn-submit {
    padding:8px 18px; border:1px solid rgba(45,181,110,.5); border-radius:8px;
    background:rgba(45,181,110,.1); color:#2db56e;
    font-size:.82rem; font-weight:700; cursor:pointer; transition:background .15s;
  }
  .cpd-btn-submit:hover    { background:rgba(45,181,110,.18); }
  .cpd-btn-submit:disabled { opacity:.5; cursor:not-allowed; }
  .cpd-btn-ghost {
    display:flex; align-items:center; justify-content:center;
    width:100%; padding:7px 14px; margin-top:12px;
    border:1px solid rgba(255,255,255,.1); border-radius:8px;
    background:transparent; color:rgba(255,255,255,.55);
    font-size:.8rem; cursor:pointer; transition:border-color .15s,color .15s;
  }
  .cpd-btn-ghost:hover { border-color:rgba(255,255,255,.22); color:rgba(255,255,255,.8); }

  /* ── Slots ── */
  .cpd-slots-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); gap:10px; }
  .cpd-slot {
    position:relative; aspect-ratio:2/3; border-radius:10px;
    cursor:default; background:none; border:none; padding:0; overflow:hidden; text-align:center;
    transition:transform .12s, border-color .15s;
  }
  .cpd-slot-interactive { cursor:pointer; }
  .cpd-slot-interactive:hover { transform:translateY(-2px); }
  .cpd-slot-empty {
    border:2px dashed rgba(255,255,255,.14); background:rgba(255,255,255,.02); border-radius:10px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;
  }
  .cpd-slot-empty.cpd-slot-interactive:hover { border-color:rgba(200,168,75,.4); background:rgba(200,168,75,.04); }
  .cpd-slot-number    { font-size:1.2rem; font-weight:700; color:rgba(255,255,255,.18); }
  .cpd-slot-add-hint  { font-size:.65rem; font-weight:600; color:rgba(200,168,75,.5); letter-spacing:.06em; text-transform:uppercase; }
  .cpd-slot-filled {
    display:flex; flex-direction:column;
    border:1px solid rgba(255,255,255,.1); border-radius:10px; background:#1c1c2c; overflow:hidden;
  }
  .cpd-slot-filled:hover .cpd-slot-remove { opacity:1; }
  .cpd-slot-img             { width:100%; aspect-ratio:1/1; object-fit:cover; flex-shrink:0; }
  .cpd-slot-img-placeholder {
    width:100%; aspect-ratio:1/1; display:flex; align-items:center; justify-content:center;
    font-size:1.1rem; font-weight:700; color:rgba(255,255,255,.3); background:rgba(255,255,255,.04); flex-shrink:0;
  }
  .cpd-slot-info  { padding:6px 4px 4px; display:flex; flex-direction:column; gap:2px; flex:1; }
  .cpd-slot-name  { font-size:.65rem; font-weight:700; color:#e0e0e8; line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .cpd-slot-rarity{ font-size:.55rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; }
  .cpd-slot-remove {
    position:absolute; top:4px; right:4px; width:18px; height:18px; border-radius:50%;
    background:rgba(214,58,50,.85); color:#fff; font-size:.6rem;
    display:flex; align-items:center; justify-content:center;
    opacity:0; transition:opacity .15s; pointer-events:none;
  }
  .cpd-lineup-submitted {
    margin:14px 0 0; padding:9px 14px; border-radius:8px;
    background:rgba(45,181,110,.08); border:1px solid rgba(45,181,110,.2);
    font-size:.8rem; color:#2db56e; font-weight:600;
  }

  /* ── Settled block ── */
  .cpd-block-settled { background:rgba(200,168,75,.05); border-color:rgba(200,168,75,.2); }
  .cpd-settled-header { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
  .cpd-settled-icon   { font-size:1.8rem; line-height:1; }
  .cpd-settled-stats  { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
  .cpd-settled-stat {
    display:flex; flex-direction:column; gap:3px; padding:10px 16px; min-width:100px;
    background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:10px;
    font-size:.82rem;
  }
  .cpd-settled-stat span   { color:rgba(255,255,255,.4); font-size:.7rem; }
  .cpd-settled-stat strong { font-size:1.1rem; color:#e0e0e8; }
  .cpd-settled-note { font-size:.75rem; color:rgba(255,255,255,.3); margin:0; line-height:1.5; }

  /* ── Leaderboard ── */
  .cpd-leaderboard { display:flex; flex-direction:column; gap:2px; }
  .cpd-lb-row {
    display:grid; grid-template-columns:42px 1fr auto; align-items:center; gap:10px;
    padding:9px 10px; border-radius:8px; border:1px solid transparent;
    font-size:.85rem; transition:background .12s;
  }
  .cpd-lb-row:hover      { background:rgba(255,255,255,.03); }
  .cpd-lb-row-me         { background:rgba(200,168,75,.07); border-color:rgba(200,168,75,.2); }
  .cpd-lb-row-top .cpd-lb-rank { font-size:1rem; }
  .cpd-lb-rank  { font-size:.8rem; font-weight:700; color:rgba(255,255,255,.45); text-align:center; }
  .cpd-lb-name  { color:#e0e0e8; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cpd-lb-row-me .cpd-lb-name { color:#ecc96a; font-weight:700; }
  .cpd-lb-score { font-family:'JetBrains Mono',monospace; font-size:.82rem; color:rgba(255,255,255,.6); white-space:nowrap; }

  /* ── Sidebar ── */
  .cpd-sidebar .cpd-block        { margin-bottom:12px; }
  .cpd-sidebar .cpd-block-title  { font-size:1rem; margin-bottom:14px; }

  /* ── Rewards ── */
  .cpd-rewards-list   { display:flex; flex-direction:column; gap:2px; }
  .cpd-reward-row     { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-radius:8px; font-size:.82rem; border:1px solid transparent; }
  .cpd-reward-row-first { background:rgba(200,168,75,.06); border-color:rgba(200,168,75,.2); }
  .cpd-reward-label   { color:rgba(255,255,255,.55); font-weight:500; }
  .cpd-reward-amounts { display:flex; gap:6px; align-items:center; }
  .cpd-reward-gold    { color:#ecc96a; }
  .cpd-reward-row-first .cpd-reward-label { color:rgba(255,255,255,.8); font-weight:700; }

  /* ── Info ── */
  .cpd-info-grid { display:grid; grid-template-columns:auto 1fr; gap:6px 14px; margin:0; font-size:.82rem; }
  .cpd-info-grid dt { color:rgba(255,255,255,.4); font-weight:500; white-space:nowrap; }
  .cpd-info-grid dd { margin:0; color:#e0e0e8; font-weight:600; }
  .cpd-mono { font-family:'JetBrains Mono',monospace; font-size:.75rem; color:rgba(255,255,255,.5); }

  /* ── Schedule ── */
  .cpd-schedule { display:flex; flex-direction:column; }
  .cpd-schedule-step { display:flex; gap:12px; }
  .cpd-step-indicator { display:flex; flex-direction:column; align-items:center; flex-shrink:0; width:14px; padding-top:3px; }
  .cpd-step-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; display:block; }
  .cpd-step-dot-done    { background:#2db56e; }
  .cpd-step-dot-live    { background:#2db56e; animation:cpdPulse 1.8s ease-in-out infinite; }
  .cpd-step-dot-pending { background:transparent; border:2px solid rgba(255,255,255,.18); }
  .cpd-step-line { flex:1; width:1px; background:rgba(255,255,255,.08); margin:4px 0; min-height:18px; }
  .cpd-schedule-step:last-child .cpd-step-line { display:none; }
  .cpd-step-content { padding-bottom:16px; }
  .cpd-step-label { font-size:.82rem; font-weight:600; color:rgba(255,255,255,.7); margin:0 0 2px; }
  .cpd-step-active .cpd-step-label { color:#e0e0e8; }
  .cpd-step-done .cpd-step-label   { color:rgba(255,255,255,.4); }
  .cpd-step-date { font-size:.72rem; color:rgba(255,255,255,.35); margin:0; font-family:'JetBrains Mono',monospace; }
  .cpd-step-active .cpd-step-date  { color:#2db56e; font-weight:600; }

  /* ── Skeleton ── */
  .cpd-skeleton      { display:flex; flex-direction:column; gap:14px; }
  .cpd-skeleton-topbar { height:44px; border-radius:8px; background:rgba(255,255,255,.04); animation:cpdShimmer 1.6s infinite; }
  .cpd-skeleton-hero   { height:130px; border-radius:14px; background:rgba(255,255,255,.04); animation:cpdShimmer 1.6s infinite .1s; }
  .cpd-skeleton-body   { display:grid; grid-template-columns:1fr 300px; gap:16px; }
  .cpd-skeleton-main   { height:480px; border-radius:14px; background:rgba(255,255,255,.04); animation:cpdShimmer 1.6s infinite .2s; }
  .cpd-skeleton-side   { height:380px; border-radius:14px; background:rgba(255,255,255,.04); animation:cpdShimmer 1.6s infinite .3s; }
  @keyframes cpdShimmer { 0%,100%{opacity:.6} 50%{opacity:1} }

  /* ── Responsive ── */
  @media (max-width:768px) {
    .cpd-hero { grid-template-columns:1fr; gap:16px; }
    .cpd-stat-pills { justify-content:flex-start; }
    .cpd-grid { grid-template-columns:1fr; }
    .cpd-sidebar { order:2; }
    .cpd-main   { order:1; }
    /* 3+2 layout for 5-slot roster */
    .cpd-slots-grid { grid-template-columns:repeat(3,1fr); }
    .cpd-slots-grid-5 { grid-template-columns:repeat(6,1fr); }
    .cpd-slots-grid-5 .cpd-slot           { grid-column:span 2; }
    .cpd-slots-grid-5 .cpd-slot:nth-child(4) { grid-column:2 / span 2; }
    .cpd-slots-grid-5 .cpd-slot:nth-child(5) { grid-column:4 / span 2; }
    .cpd-skeleton-body { grid-template-columns:1fr; }
  }
`;
