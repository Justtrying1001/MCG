"use client";

import { useEffect, useMemo, useState } from "react";
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
    liveAt: string | null;
    lockAt: string | null;
    liveAt: string | null;
    endsAt: string | null;
    openAt?: string | null;
    rules: ContestRule[];
    seasonName?: string | null;
    leagueTierRequired?: string | null;
    _count: { entries: number };
    seasonName?: string | null;
    seasonId?: string | null;
    leagueTierRequired?: string | null;
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
      setSubmitState("idle");
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
