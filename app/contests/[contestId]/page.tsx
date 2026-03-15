"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { CardSelectorModal } from "@/components/contests/CardSelectorModal";
import { RulesDrawer } from "@/components/contests/RulesDrawer";
import { loadContestCache } from "@/components/contests/contestUtils";
import { useSession } from "@/components/useSession";
import type { ContestRule, ContestStatus, LineupOption } from "@/components/contests/types";
import type { MvpCollectionItem } from "@/types/cards";

// ─── Types ───────────────────────────────────────────────────────────────────

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
    _count: { entries: number };
    seasonName?: string | null;
    seasonId?: string | null;
    leagueTierRequired?: string | null;
  };
  userEntry: {
    id: string;
    status: string;
    rosterLocks: Array<{ id: string; ownedCardInstanceId: string }>;
  } | null;
};

type RankingPayload = {
  rankings: Array<{ id: string; userId: string; rank: number; score: number; user: { displayName: string; xUsername: string } }>;
};

type RewardTier = { label: string; bundleName: string; pointsAmount: number; xpAmount: number; packsCount: number };
type RewardPreviewPayload = { hasPolicyData: boolean; tiers: RewardTier[] };

type ScoreBreakdownRow = {
  id: string;
  baseScore: number;
  rarityMultiplier: number;
  editionMultiplier: number;
  finalScore: number;
  dataQuality: string;
  tokenProject: { displayName: string; slug: string };
  cardInstance: { cardTemplate: { name: string; imageUrl: string | null; rarity: { code: string } | null; edition: { code: string } | null } };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCountdown(targetMs: number | null, nowMs: number): string {
  if (targetMs === null) return "--:--:--";
  const diff = Math.max(0, targetMs - nowMs);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function mapGuestCollectionToOptions(collection: MvpCollectionItem[]): LineupOption[] {
  const list: LineupOption[] = [];
  for (const row of collection) {
    const total = Math.max(1, row.instanceCount);
    for (let i = 0; i < total; i += 1) {
      list.push({
        instanceId: `guest-${row.templateId}-${i + 1}`,
        cardTemplateId: row.templateId,
        isLockedByActiveContest: false,
        cardSetId: row.card.setCode ?? "guest-set",
        cardSetCode: row.card.setCode ?? "SET",
        cardSetName: row.card.setEditionLabel ?? "Guest Collection",
        rarityCode: row.card.rarity,
        editionCode: row.card.edition,
        name: row.card.displayName,
        imageUrl: row.card.imageUrl,
        tokenProjectName: row.card.symbol || row.card.displayName,
      });
    }
  }
  return list;
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
  const [rewardTiers, setRewardTiers] = useState<RewardTier[] | null>(null);
  const [options, setOptions] = useState<LineupOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());

  // Countdown tick
  useEffect(() => {
    const qp = new URLSearchParams(window.location.search).get("tab");
    if (qp === "overview" || qp === "entry" || qp === "leaderboard" || qp === "rewards" || qp === "rules") {
      setActiveTab(qp);
    }
  }, []);

  // Data fetch
  useEffect(() => {
    if (loading) return;
    setError("");
    void loadAll();
  }, [loadAll, loading]);

  const isGuest = !loading && me?.mode === "guest";

  const rule = detail?.contest.rules[0];
  const maxRosterSize = rule?.maxRosterSize ?? 5;
  const isGuest = !loading && me?.mode === "guest";
  const canManageLineup = detail?.contest.status === "OPEN";
  const canEnter = canManageLineup && !isGuest;

  const filteredOptions = useMemo(
    () => (rule?.cardSetId ? options.filter((item) => item.cardSetId === rule.cardSetId) : options),
    [options, rule?.cardSetId],
  );

  const selectedCards = useMemo(
    () => Array.from({ length: maxRosterSize }).map((_, index) => filteredOptions.find((item) => item.instanceId === selected[index]) ?? null),
    [filteredOptions, maxRosterSize, selected],
  );

  const userStatus = detail ? getUserStatus(detail.contest.status, hasEntry, selected.filter(Boolean).length) : "";
  const myRankingRow = ranking?.rankings?.find((row) => row.userId === me?.user.id) ?? null;
  const filledCount = selected.filter(Boolean).length;

  // Countdown target
  const countdownTarget = useMemo(() => {
    if (!detail) return null;
    const { status, lockAt, endsAt } = detail.contest;
    if (status === "OPEN" && lockAt) return new Date(lockAt).getTime();
    if ((status === "LOCKED" || status === "LIVE") && endsAt) return new Date(endsAt).getTime();
    return null;
  }, [detail]);

  const toggle = (instanceId: string) => {
    if (!canManageLineup) return;
    setSelected((prev) => {
      if (activeSlot !== null) {
        const next = [...prev];
        const alreadyIn = next.indexOf(instanceId);
        if (alreadyIn >= 0) next.splice(alreadyIn, 1);
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
    setSelected((prev) => prev.filter((_, index) => index !== slot));
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
    if (!detail || !canEnter || selected.length !== maxRosterSize) return;
    setSubmitState("saving");
    setBuilderMessage("");
    const res = await fetch(`/api/contests/${params.contestId}/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineupInstanceIds: selected }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setBuilderMessage(payload?.error ?? "Contest entry failed");
      setSubmitState("idle");
      return;
    }
    const updated = await fetch(`/api/contests/${params.contestId}`, { cache: "no-store" });
    if (updated.ok) setDetail((await updated.json()) as ContestDetail);
    setSubmitState("idle");
    closeBuilder();
    await loadAll();
  };

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (!detail) {
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

  const contest = detail.contest;
  const status = contest.status;
  const isOpen = status === "OPEN";
  const isLive = status === "LIVE";
  const isSettled = status === "SETTLED";

  const scheduleSteps = [
    {
      key: "open",
      label: "Registration open",
      date: contest.openAt ? fmtDate(contest.openAt) : "Contest open",
      active: isOpen,
      done: ["LOCKED", "LIVE", "SETTLED"].includes(status),
    },
    {
      key: "lock",
      label: "Lineup lock",
      date: fmtDate(contest.lockAt),
      active: status === "LOCKED",
      done: ["LIVE", "SETTLED"].includes(status),
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
          {countdownTarget !== null && (
            <>
              <span className="cpd-topbar-label">
                {isOpen ? "Lock in" : isLive ? "Ends in" : "Closed"}
              </span>
              <span className="cpd-countdown">{fmtCountdown(countdownTarget, nowTs)}</span>
            </>
          )}
          {countdownTarget === null && (
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

      {/* ── Error/notice banner ── */}
      {error && (
        <div className="cpd-banner cpd-banner-warn" role="alert">{error}</div>
      )}
      {isGuest && (
        <div className="cpd-banner cpd-banner-info">
          Guest preview — connect with X to submit a lineup and appear on the leaderboard.
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="cpd-grid">

        {/* ── Left column ── */}
        <main className="cpd-main">

          {/* Lineup block */}
          <section className="cpd-block">
            <div className="cpd-block-header">
              <div>
                <h2 className="cpd-block-title">Your Lineup</h2>
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

            <div className="cpd-slots-grid">
              {selectedCards.map((card, slotIndex) => (
                <button
                  key={slotIndex}
                  type="button"
                  className={`cpd-slot${card ? " cpd-slot-filled" : " cpd-slot-empty"}${canManageLineup ? " cpd-slot-interactive" : ""}`}
                  onClick={() => handleSlotClick(slotIndex)}
                  title={card ? `Slot ${slotIndex + 1}: ${card.name} — click to remove` : `Slot ${slotIndex + 1}: empty — click to add a card`}
                >
                  {card ? (
                    <>
                      {card.imageUrl ? (
                        <img
                          className="cpd-slot-img"
                          src={card.imageUrl}
                          alt={card.name}
                          loading="lazy"
                        />
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
                      {canManageLineup && (
                        <span className="cpd-slot-remove" aria-hidden="true">✕</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="cpd-slot-number">{slotIndex + 1}</span>
                      {canManageLineup && (
                        <span className="cpd-slot-add-hint">+ Add</span>
                      )}
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

          {/* Leaderboard block */}
          <section className="cpd-block">
            <div className="cpd-block-header">
              <h2 className="cpd-block-title">Leaderboard</h2>
              <span className="cpd-block-meta">{contest._count.entries} entries</span>
            </div>

            {(!ranking || ranking.rankings.length === 0) ? (
              <p className="cpd-empty-msg">No entries yet — be the first to submit a lineup.</p>
            ) : (
              <div className="cpd-leaderboard">
                {ranking.rankings.slice(0, 20).map((row) => {
                  const isMe = row.userId === me?.user.id;
                  const name = row.user.displayName?.trim() || (row.user.xUsername ? `@${row.user.xUsername}` : `Player #${row.rank}`);
                  return (
                    <div key={row.id} className={`cpd-lb-row${isMe ? " cpd-lb-row-me" : ""}${row.rank <= 3 ? " cpd-lb-row-top" : ""}`}>
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

          {/* Rewards block */}
          <section className="cpd-block">
            <h2 className="cpd-block-title">Rewards</h2>
            {rewardTiers && rewardTiers.length > 0 ? (
              <div className="cpd-rewards-list">
                {rewardTiers.map((tier, i) => (
                  <div key={i} className={`cpd-reward-row${i === 0 ? " cpd-reward-row-first" : ""}`}>
                    <span className="cpd-reward-label">{tier.label}</span>
                    <div className="cpd-reward-amounts">
                      {tier.pointsAmount > 0 && (
                        <strong className={i === 0 ? "cpd-reward-gold" : ""}>{tier.pointsAmount} pts</strong>
                      )}
                      {tier.xpAmount > 0 && <span>+{tier.xpAmount} XP</span>}
                      {tier.packsCount > 0 && <span>{tier.packsCount} pack{tier.packsCount > 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cpd-rewards-list">
                <div className="cpd-reward-row cpd-reward-row-first">
                  <span className="cpd-reward-label">Rank #1</span>
                  <strong className="cpd-reward-gold">{rewardPoints} pts</strong>
                </div>
                <div className="cpd-reward-row">
                  <span className="cpd-reward-label">Top 3</span>
                  <span>{Math.round(rewardPoints * 0.6)} pts</span>
                </div>
                <div className="cpd-reward-row">
                  <span className="cpd-reward-label">Top 10</span>
                  <span>{Math.round(rewardPoints * 0.3)} pts</span>
                </div>
              </div>
            )}

            {myRewards && isSettled && (
              <div className="cpd-my-rewards">
                <p className="cpd-block-meta">Your rewards</p>
                {myRewards.pointsTotal > 0 && <strong className="cpd-reward-gold">{myRewards.pointsTotal} pts</strong>}
                {myRewards.xpTotal > 0 && <span>+{myRewards.xpTotal} XP</span>}
                {myRewards.packsTotal > 0 && <span>{myRewards.packsTotal} pack{myRewards.packsTotal > 1 ? "s" : ""}</span>}
              </div>
            )}
          </section>

          {/* Info block */}
          <section className="cpd-block">
            <h2 className="cpd-block-title">Info</h2>
            <dl className="cpd-info-grid">
              <dt>Lineup size</dt>
              <dd>{maxRosterSize} cards</dd>
              <dt>Entry</dt>
              <dd>Free</dd>
              <dt>League</dt>
              <dd>{contest.leagueTierRequired ?? "Open"}</dd>
              <dt>Field tier</dt>
              <dd>{fieldTier}</dd>
              <dt>Code</dt>
              <dd className="cpd-mono">{contest.code}</dd>
            </dl>
            <button
              type="button"
              className="cpd-btn-ghost"
              onClick={() => setRulesOpen(true)}
            >
              View rules
            </button>
          </section>

          {/* Schedule block */}
          <section className="cpd-block">
            <h2 className="cpd-block-title">Schedule</h2>
            <div className="cpd-schedule">
              {scheduleSteps.map((step) => (
                <div key={step.key} className={`cpd-schedule-step${step.active ? " cpd-step-active" : ""}${step.done ? " cpd-step-done" : ""}`}>
                  <div className="cpd-step-indicator">
                    {step.done ? (
                      <span className="cpd-step-dot cpd-step-dot-done" aria-hidden="true" />
                    ) : step.active ? (
                      <span className="cpd-step-dot cpd-step-dot-live" aria-hidden="true" />
                    ) : (
                      <span className="cpd-step-dot cpd-step-dot-pending" aria-hidden="true" />
                    )}
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

        </aside>
      </div>

      {/* ── Card picker modal ── */}
      <CardSelectorModal
        open={showModal}
        options={filteredOptions}
        selectedIds={selected}
        onToggle={(instanceId) => {
          toggle(instanceId);
          if (activeSlot !== null) {
            setActiveSlot(null);
            setShowModal(false);
          }
        }}
        onClose={() => { setShowModal(false); setActiveSlot(null); }}
        canEnter={Boolean(canEnter)}
      />

      {/* ── Rules drawer ── */}
      <RulesDrawer
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        rosterSize={maxRosterSize}
        restrictedSet={Boolean(rule?.cardSetId)}
        status={contest.status}
      />
    </SiteShell>
  );
}

// ─── Embedded styles ──────────────────────────────────────────────────────────

const CSS = `
  /* ── Fonts ── */
  .cpd-hero-title,
  .cpd-block-title {
    font-family: 'Bebas Neue', 'Barlow Condensed', 'Rajdhani', sans-serif;
  }

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
  .cpd-topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .cpd-topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cpd-topbar-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e0e0e8;
  }
  .cpd-topbar-label {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cpd-countdown {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.05rem;
    font-weight: 700;
    color: #ecc96a;
    letter-spacing: 0.04em;
  }
  .cpd-league-badge {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 2px 8px;
    border-radius: 20px;
    background: rgba(200, 168, 75, 0.15);
    border: 1px solid rgba(200, 168, 75, 0.35);
    color: #c8a84b;
  }
  .cpd-status-chip {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 3px 10px;
    border-radius: 20px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.6);
  }
  .cpd-status-chip[data-status="SETTLED"] { color: #2db56e; border-color: rgba(45,181,110,0.3); background: rgba(45,181,110,0.08); }
  .cpd-status-chip[data-status="LIVE"] { color: #ecc96a; border-color: rgba(236,201,106,0.3); background: rgba(236,201,106,0.08); }

  /* Live dot */
  .cpd-dot-live {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #2db56e;
    animation: cpdPulse 1.8s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes cpdPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }

  /* ── Hero ── */
  .cpd-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 24px;
    padding: 28px 0 20px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    margin-bottom: 24px;
  }
  .cpd-hero-eyebrow {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(255,255,255,0.35);
    margin: 0 0 6px;
  }
  .cpd-hero-title {
    font-size: clamp(2.8rem, 6vw, 5rem);
    line-height: 0.9;
    letter-spacing: 0.02em;
    color: #ffffff;
    margin: 0 0 6px;
  }
  .cpd-hero-subtitle {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.5);
    margin: 0;
  }
  .cpd-stat-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .cpd-stat-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 10px 18px;
    background: #141420;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    min-width: 80px;
  }
  .cpd-stat-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255,255,255,0.4);
    white-space: nowrap;
  }
  .cpd-stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #e0e0e8;
    line-height: 1;
  }
  .cpd-stat-gold { color: #ecc96a; }

  /* ── Banners ── */
  .cpd-banner {
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 0.85rem;
    margin-bottom: 16px;
  }
  .cpd-banner-warn {
    background: rgba(214, 58, 50, 0.1);
    border: 1px solid rgba(214, 58, 50, 0.25);
    color: #f87171;
  }
  .cpd-banner-info {
    background: rgba(200, 168, 75, 0.08);
    border: 1px solid rgba(200, 168, 75, 0.2);
    color: #c8a84b;
  }

  /* ── Grid ── */
  .cpd-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 20px;
    align-items: start;
  }

  /* ── Shared block ── */
  .cpd-block {
    background: #141420;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .cpd-block-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .cpd-block-title {
    font-size: 1.2rem;
    letter-spacing: 0.04em;
    color: #e0e0e8;
    margin: 0;
    line-height: 1.1;
  }
  .cpd-block-meta {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.35);
    margin: 3px 0 0;
  }
  .cpd-empty-msg {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.35);
    text-align: center;
    padding: 24px 0;
    margin: 0;
  }

  /* ── Lineup actions ── */
  .cpd-lineup-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .cpd-btn-gold {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #c8a84b, #ecc96a);
    color: #0c0c12;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .cpd-btn-gold:hover { opacity: 0.85; }
  .cpd-btn-submit {
    padding: 8px 18px;
    border: 1px solid rgba(45,181,110,0.5);
    border-radius: 8px;
    background: rgba(45,181,110,0.1);
    color: #2db56e;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }
  .cpd-btn-submit:hover { background: rgba(45,181,110,0.18); }
  .cpd-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .cpd-btn-ghost {
    display: inline-flex;
    align-items: center;
    padding: 7px 14px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    background: transparent;
    color: rgba(255,255,255,0.55);
    font-size: 0.8rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    margin-top: 12px;
    width: 100%;
    justify-content: center;
  }
  .cpd-btn-ghost:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); }

  /* ── Slots ── */
  .cpd-slots-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }
  .cpd-slot {
    position: relative;
    aspect-ratio: 2 / 3;
    border-radius: 10px;
    cursor: default;
    transition: transform 0.12s, border-color 0.15s;
    background: none;
    border: none;
    padding: 0;
    overflow: hidden;
    text-align: center;
  }
  .cpd-slot-interactive { cursor: pointer; }
  .cpd-slot-interactive:hover { transform: translateY(-2px); }
  .cpd-slot-empty {
    border: 2px dashed rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.02);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .cpd-slot-empty.cpd-slot-interactive:hover {
    border-color: rgba(200,168,75,0.4);
    background: rgba(200,168,75,0.04);
  }
  .cpd-slot-number {
    font-size: 1.2rem;
    font-weight: 700;
    color: rgba(255,255,255,0.18);
  }
  .cpd-slot-add-hint {
    font-size: 0.65rem;
    font-weight: 600;
    color: rgba(200,168,75,0.5);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .cpd-slot-filled {
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    background: #1c1c2c;
    overflow: hidden;
  }
  .cpd-slot-filled:hover .cpd-slot-remove { opacity: 1; }
  .cpd-slot-img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    flex-shrink: 0;
  }
  .cpd-slot-img-placeholder {
    width: 100%;
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    font-weight: 700;
    color: rgba(255,255,255,0.3);
    background: rgba(255,255,255,0.04);
    flex-shrink: 0;
  }
  .cpd-slot-info {
    padding: 6px 4px 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }
  .cpd-slot-name {
    font-size: 0.65rem;
    font-weight: 700;
    color: #e0e0e8;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .cpd-slot-rarity {
    font-size: 0.55rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cpd-slot-remove {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(214, 58, 50, 0.85);
    color: #fff;
    font-size: 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
  }
  .cpd-lineup-submitted {
    margin: 14px 0 0;
    padding: 9px 14px;
    border-radius: 8px;
    background: rgba(45,181,110,0.08);
    border: 1px solid rgba(45,181,110,0.2);
    font-size: 0.8rem;
    color: #2db56e;
    font-weight: 600;
  }

  /* ── Leaderboard ── */
  .cpd-leaderboard {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cpd-lb-row {
    display: grid;
    grid-template-columns: 42px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: 8px;
    border: 1px solid transparent;
    font-size: 0.85rem;
    transition: background 0.12s;
  }
  .cpd-lb-row:hover { background: rgba(255,255,255,0.03); }
  .cpd-lb-row-me {
    background: rgba(200,168,75,0.07);
    border-color: rgba(200,168,75,0.2);
  }
  .cpd-lb-row-top .cpd-lb-rank { font-size: 1rem; }
  .cpd-lb-rank {
    font-size: 0.8rem;
    font-weight: 700;
    color: rgba(255,255,255,0.45);
    text-align: center;
  }
  .cpd-lb-name {
    color: #e0e0e8;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cpd-lb-row-me .cpd-lb-name { color: #ecc96a; font-weight: 700; }
  .cpd-lb-score {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.82rem;
    color: rgba(255,255,255,0.6);
    white-space: nowrap;
  }

  /* ── Sidebar ── */
  .cpd-sidebar .cpd-block {
    margin-bottom: 12px;
  }
  .cpd-sidebar .cpd-block-title {
    font-size: 1rem;
    margin-bottom: 14px;
  }

  /* ── Rewards ── */
  .cpd-rewards-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cpd-reward-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 0.82rem;
    border: 1px solid transparent;
  }
  .cpd-reward-row-first {
    background: rgba(200,168,75,0.06);
    border-color: rgba(200,168,75,0.2);
  }
  .cpd-reward-label { color: rgba(255,255,255,0.55); font-weight: 500; }
  .cpd-reward-amounts { display: flex; gap: 6px; align-items: center; }
  .cpd-reward-gold { color: #ecc96a; }
  .cpd-reward-row-first .cpd-reward-label { color: rgba(255,255,255,0.8); font-weight: 700; }
  .cpd-my-rewards {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.07);
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.82rem;
    color: rgba(255,255,255,0.6);
  }

  /* ── Info grid ── */
  .cpd-info-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 14px;
    margin: 0;
    font-size: 0.82rem;
  }
  .cpd-info-grid dt {
    color: rgba(255,255,255,0.4);
    font-weight: 500;
    white-space: nowrap;
  }
  .cpd-info-grid dd {
    margin: 0;
    color: #e0e0e8;
    font-weight: 600;
  }
  .cpd-mono {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.5);
  }

  /* ── Schedule ── */
  .cpd-schedule {
    display: flex;
    flex-direction: column;
  }
  .cpd-schedule-step {
    display: flex;
    gap: 12px;
  }
  .cpd-step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 14px;
    padding-top: 3px;
  }
  .cpd-step-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    display: block;
  }
  .cpd-step-dot-done { background: #2db56e; }
  .cpd-step-dot-live {
    background: #2db56e;
    animation: cpdPulse 1.8s ease-in-out infinite;
  }
  .cpd-step-dot-pending {
    background: transparent;
    border: 2px solid rgba(255,255,255,0.18);
  }
  .cpd-step-line {
    flex: 1;
    width: 1px;
    background: rgba(255,255,255,0.08);
    margin: 4px 0;
    min-height: 18px;
  }
  .cpd-schedule-step:last-child .cpd-step-line { display: none; }
  .cpd-step-content {
    padding-bottom: 16px;
  }
  .cpd-step-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    margin: 0 0 2px;
  }
  .cpd-step-active .cpd-step-label { color: #e0e0e8; }
  .cpd-step-done .cpd-step-label { color: rgba(255,255,255,0.4); }
  .cpd-step-date {
    font-size: 0.72rem;
    color: rgba(255,255,255,0.35);
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
  }
  .cpd-step-active .cpd-step-date { color: #2db56e; font-weight: 600; }

  /* ── Skeleton ── */
  .cpd-skeleton { display: flex; flex-direction: column; gap: 14px; }
  .cpd-skeleton-topbar { height: 44px; border-radius: 8px; background: rgba(255,255,255,0.04); animation: cpdShimmer 1.6s infinite; }
  .cpd-skeleton-hero { height: 130px; border-radius: 14px; background: rgba(255,255,255,0.04); animation: cpdShimmer 1.6s infinite 0.1s; }
  .cpd-skeleton-body { display: grid; grid-template-columns: 1fr 300px; gap: 16px; }
  .cpd-skeleton-main { height: 480px; border-radius: 14px; background: rgba(255,255,255,0.04); animation: cpdShimmer 1.6s infinite 0.2s; }
  .cpd-skeleton-side { height: 380px; border-radius: 14px; background: rgba(255,255,255,0.04); animation: cpdShimmer 1.6s infinite 0.3s; }
  @keyframes cpdShimmer {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .cpd-hero {
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .cpd-stat-pills {
      justify-content: flex-start;
    }
    .cpd-grid {
      grid-template-columns: 1fr;
    }
    .cpd-sidebar {
      order: 2;
    }
    .cpd-main {
      order: 1;
    }
    .cpd-slots-grid {
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    }
    .cpd-skeleton-body {
      grid-template-columns: 1fr;
    }
  }
`;
