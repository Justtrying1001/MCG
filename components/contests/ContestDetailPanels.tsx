import Link from "next/link";
import { Surface } from "@/components/ui/Surface";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { toMvpCardView } from "@/components/contests/lineupCardMapper";
import { ScoreBreakdownPanel, type BreakdownRow } from "@/components/contests/ScoreBreakdownPanel";
import { ContestResultPanel } from "@/components/contests/ContestResultPanel";
import type { ContestStatus, LineupOption } from "@/components/contests/types";

export type RewardTier = {
  label: string;
  bundleName: string;
  pointsAmount: number;
  xpAmount: number;
  packsCount: number;
};

export type RewardSummary = {
  pointsTotal: number;
  xpTotal: number;
  packsTotal: number;
};

export type HeroPanelProps = {
  code: string;
  title: string;
  status: ContestStatus;
  summaryItems: string[];
  countdownLabel: string;
  countdownValue: string;
  rewardTeaser?: string | null;
};

export function HeroPanel({ code, title, status, summaryItems, countdownLabel, countdownValue, rewardTeaser }: HeroPanelProps) {
  const statusTone = status === "LIVE" ? "live" : status === "LOCKED" ? "locked" : status === "SETTLED" ? "settled" : "open";

  return (
    <Surface className="contest-detail-shell-hero" variant="raised">
      <div className="contest-detail-hero-main">
        <div className="contest-detail-hero-meta">
          <span className="contest-detail-code mono">{code}</span>
          <span className={`mcg-badge ${statusTone}`}>{status}</span>
        </div>
        <h1>{title}</h1>
        <p className="contest-detail-summary-line">{summaryItems.join(" • ")}</p>
      </div>

      <div className="contest-detail-hero-side">
        <div className="contest-detail-countdown-block">
          <span>{countdownLabel}</span>
          <strong>{countdownValue}</strong>
        </div>
        {rewardTeaser ? <p className="contest-detail-reward-teaser">{rewardTeaser}</p> : null}
      </div>
    </Surface>
  );
}

export type PrimaryMetric = { label: string; value: string; tone?: "neutral" | "good" | "accent" };

export type PrimaryActionPanelProps = {
  eyebrow: string;
  headline: string;
  body: string;
  metrics?: PrimaryMetric[];
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  secondaryText?: string | null;
  flash?: string | null;
  error?: string | null;
};

export function PrimaryActionPanel({ eyebrow, headline, body, metrics = [], primaryAction, secondaryText, flash, error }: PrimaryActionPanelProps) {
  return (
    <Surface className="contest-detail-primary-panel" variant="highlight">
      <div className="contest-detail-primary-copy">
        <p className="mcg-eyebrow">{eyebrow}</p>
        <h2>{headline}</h2>
        <p>{body}</p>
        {secondaryText ? <p className="contest-detail-primary-secondary">{secondaryText}</p> : null}
        {error ? <p className="contest-detail-inline-alert error">{error}</p> : null}
        {!error && flash ? <p className="contest-detail-inline-alert success">{flash}</p> : null}
      </div>

      <div className="contest-detail-primary-side">
        {metrics.length > 0 ? (
          <div className={`contest-detail-metric-grid metrics-${Math.min(metrics.length, 3)}`}>
            {metrics.map((metric) => (
              <article key={metric.label} className={`contest-detail-metric tone-${metric.tone ?? "neutral"}`}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </div>
        ) : null}

        {primaryAction ? (
          <button type="button" className="mcg-btn primary contest-detail-primary-cta" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
            {primaryAction.label}
          </button>
        ) : null}
      </div>
    </Surface>
  );
}

export type SlotCardView = { card: LineupOption; finalScore: number | null };

export type LineupPanelProps = {
  title?: string;
  label: string;
  helperText: string;
  rosterSize: number;
  slotCards: Array<SlotCardView | null>;
  selectedCount: number;
  isOpen: boolean;
  isLocked: boolean;
  isLive: boolean;
  isSettled: boolean;
  canInteract: boolean;
  onOpenBuilder?: (slotIndex: number) => void;
  emptyMessage?: string;
};

export function LineupPanel({
  title = "Your lineup",
  label,
  helperText,
  rosterSize,
  slotCards,
  selectedCount,
  isOpen,
  isLocked,
  isLive,
  isSettled,
  canInteract,
  onOpenBuilder,
  emptyMessage,
}: LineupPanelProps) {
  const slotCountClass = rosterSize >= 6 ? "dense" : rosterSize === 5 ? "balanced" : "wide";
  const hasLineup = slotCards.some(Boolean);

  return (
    <Surface className="contest-detail-block lineup-panel" variant="raised">
      <div className="contest-detail-block-head">
        <div>
          <p className="mcg-eyebrow">Lineup</p>
          <h3>{title}</h3>
        </div>
        <div className="contest-detail-block-head-meta">
          <span className="mcg-chip">{label}</span>
          <span className="contest-detail-inline-note">{selectedCount}/{rosterSize} selected</span>
        </div>
      </div>

      <p className="contest-detail-panel-copy">{helperText}</p>

      <div className={`contest-detail-lineup-grid ${slotCountClass}`}>
        {Array.from({ length: rosterSize }).map((_, index) => {
          const slotCard = slotCards[index];
          if (!slotCard) {
            const actionable = isOpen && canInteract && onOpenBuilder;
            return (
              <button
                key={index}
                type="button"
                className={`contest-detail-lineup-slot empty ${actionable ? "actionable" : "static"}`}
                onClick={() => actionable && onOpenBuilder(index)}
                disabled={!actionable}
              >
                <span>Slot {index + 1}</span>
                <strong>{isOpen ? "Add card" : emptyMessage ?? "No card submitted"}</strong>
              </button>
            );
          }

          const cardView = toMvpCardView(slotCard.card);
          return (
            <button
              key={index}
              type="button"
              className={`contest-detail-lineup-slot filled ${canInteract && isOpen ? "actionable" : "static"}`}
              onClick={() => canInteract && isOpen && onOpenBuilder?.(index)}
              disabled={!(canInteract && isOpen && onOpenBuilder)}
            >
              {cardView ? <MvpCardTile card={cardView} variant="canonical" interactive={false} /> : <span className="contest-command-slot-missing">Card preview unavailable</span>}
              {(isLocked || isLive) ? <span className="contest-detail-slot-status">Locked</span> : null}
              {isSettled ? <span className="contest-detail-slot-score">{slotCard.finalScore !== null ? `${slotCard.finalScore.toFixed(2)} pts` : "—"}</span> : null}
            </button>
          );
        })}
      </div>

      {!hasLineup && !isOpen ? <p className="contest-detail-empty-note">{emptyMessage ?? "No lineup was submitted for this contest."}</p> : null}
    </Surface>
  );
}

export type LeaderboardRow = { id: string; userId: string; rank: number; score: number; displayName: string };

export function LeaderboardPanel({
  rows,
  compact = false,
  currentUserId,
  status,
}: {
  rows: LeaderboardRow[];
  compact?: boolean;
  currentUserId?: string;
  status: ContestStatus;
}) {
  const previewRows = compact ? rows.slice(0, 3) : rows;
  const myRow = currentUserId ? rows.find((row) => row.userId === currentUserId) ?? null : null;
  const shouldAppendMine = compact && myRow && !previewRows.some((row) => row.id === myRow.id);
  const visibleRows = shouldAppendMine ? [...previewRows, myRow] : previewRows;
  const emptyCopy = status === "OPEN" ? "No entries yet." : "Ranking pending.";

  return (
    <Surface id="contest-leaderboard" className="contest-detail-block leaderboard-panel" variant="raised">
      <div className="contest-detail-block-head">
        <div>
          <p className="mcg-eyebrow">Leaderboard</p>
          <h3>{compact ? "Top contenders" : status === "SETTLED" ? "Final leaderboard" : "Live standings"}</h3>
        </div>
        <span className="contest-detail-inline-note">{rows.length} entries</span>
      </div>

      {rows.length === 0 ? (
        <p className="contest-detail-empty-note">{emptyCopy}</p>
      ) : (
        <div className="contest-detail-leaderboard-list">
          {visibleRows.map((row) => (
            <div
              key={row.id}
              className={`contest-detail-leaderboard-row ${row.userId === currentUserId ? "is-me" : ""} ${row.rank <= 3 && !compact ? "is-top" : ""}`}
            >
              <span className="mono">#{row.rank}</span>
              <span>{row.userId === currentUserId ? "You" : row.displayName}</span>
              <strong className="mono">{row.score.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}

export function RewardsPanel({
  tiers,
  summary,
  myRewards,
  isSettled,
}: {
  tiers: RewardTier[];
  summary?: {
    pointsPool: number;
    packPool: number;
    rewardedTopPercent: number;
    rewardedWinners: number;
    participantCount: number;
  } | null;
  myRewards?: RewardSummary | null;
  isSettled: boolean;
}) {
  const hasEarnedRewards = Boolean(myRewards && (myRewards.pointsTotal > 0 || myRewards.xpTotal > 0 || myRewards.packsTotal > 0));

  return (
    <Surface className="contest-detail-block rewards-panel" variant="raised">
      <div className="contest-detail-block-head">
        <div>
          <p className="mcg-eyebrow">Rewards</p>
          <h3>{isSettled ? "Rewards outcome" : "What you can win"}</h3>
        </div>
      </div>

      {isSettled && myRewards ? (
        <div className="contest-detail-earned-rewards">
          <div className="contest-detail-earned-rewards-head">
            <strong>{hasEarnedRewards ? "Rewards earned" : "No rewards earned"}</strong>
            {hasEarnedRewards ? <span className="mcg-chip selected">Settled</span> : null}
          </div>
          <div className="contest-detail-earned-rewards-grid">
            <div><span>Points</span><strong>{myRewards.pointsTotal}</strong></div>
            <div><span>XP</span><strong>{myRewards.xpTotal}</strong></div>
            <div><span>Packs</span><strong>{myRewards.packsTotal}</strong></div>
          </div>
        </div>
      ) : null}

      {tiers.length > 0 ? (
        <div className="contest-detail-reward-tier-list">
          {tiers.slice(0, isSettled ? 5 : 4).map((tier, index) => (
            <article key={`${tier.label}-${index}`} className={index === 0 ? "featured" : ""}>
              <header>
                <strong>{tier.label}</strong>
                {tier.bundleName ? <span>{tier.bundleName}</span> : null}
              </header>
              <div>
                {tier.pointsAmount > 0 ? <span>{tier.pointsAmount} pts</span> : null}
                {tier.xpAmount > 0 ? <span>{tier.xpAmount} XP</span> : null}
                {tier.packsCount > 0 ? <span>{tier.packsCount} pack{tier.packsCount > 1 ? "s" : ""}</span> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="contest-detail-empty-note">Rewards not available yet.</p>
      )}

      {summary ? (
        <div className="contest-detail-rewards-summary-strip">
          <span>{summary.rewardedWinners} winners</span>
          <span>Top {summary.rewardedTopPercent}%</span>
          <span>{summary.participantCount} players</span>
        </div>
      ) : null}
    </Surface>
  );
}

export function FactsLifecyclePanel({
  participants,
  entryFee,
  seasonName,
  leagueTierRequired,
  lifecycleLabel,
  lifecycleCopy,
}: {
  participants: number;
  entryFee: string;
  seasonName?: string | null;
  leagueTierRequired?: string | null;
  lifecycleLabel: string;
  lifecycleCopy: string;
}) {
  const facts = [
    { label: "Participants", value: String(participants) },
    { label: "Entry fee", value: entryFee },
    ...(seasonName ? [{ label: "Season", value: seasonName }] : []),
    ...(leagueTierRequired ? [{ label: "League", value: leagueTierRequired }] : []),
  ].slice(0, 4);

  return (
    <Surface className="contest-detail-block facts-panel" variant="raised">
      <div className="contest-detail-block-head">
        <div>
          <p className="mcg-eyebrow">Contest facts</p>
          <h3>{lifecycleLabel}</h3>
        </div>
      </div>

      <p className="contest-detail-panel-copy">{lifecycleCopy}</p>

      <dl className="contest-detail-fact-list">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </Surface>
  );
}

export function ResultSummaryPanel({
  myRank,
  myScore,
  myRewards,
  rankedUsers,
}: {
  myRank: number | null;
  myScore: number | null;
  myRewards?: RewardSummary | null;
  rankedUsers: number;
}) {
  return (
    <ContestResultPanel
      status="SETTLED"
      myRank={myRank}
      myScore={myScore}
      myRewards={myRewards ?? null}
      rankedUsers={rankedUsers}
    />
  );
}

export function ResultBreakdownPanel({ rows }: { rows: BreakdownRow[] }) {
  return <ScoreBreakdownPanel rows={rows} />;
}

export function ContestDetailsAccordion({
  code,
  rosterSize,
  openAt,
  lockAt,
  liveAt,
  endsAt,
  seasonName,
  leagueTierRequired,
}: {
  code: string;
  rosterSize: number;
  openAt?: string | null;
  lockAt?: string | null;
  liveAt?: string | null;
  endsAt?: string | null;
  seasonName?: string | null;
  leagueTierRequired?: string | null;
}) {
  const items = [
    { label: "Contest code", value: code },
    { label: "Lineup size", value: `${rosterSize} cards` },
    ...(seasonName ? [{ label: "Season", value: seasonName }] : []),
    ...(leagueTierRequired ? [{ label: "League tier", value: leagueTierRequired }] : []),
    ...(openAt ? [{ label: "Registration opens", value: openAt }] : []),
    ...(lockAt ? [{ label: "Lineup lock", value: lockAt }] : []),
    ...(liveAt ? [{ label: "Contest live", value: liveAt }] : []),
    ...(endsAt ? [{ label: "Contest end", value: endsAt }] : []),
  ];

  return (
    <details className="contest-detail-accordion">
      <summary>
        <span>Contest details</span>
        <span className="contest-detail-inline-note">Rules, timing, and support metadata</span>
      </summary>
      <dl className="contest-detail-accordion-grid">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <Link href="/contests" className="contest-detail-inline-link">Back to all contests</Link>
    </details>
  );
}
