import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { toMvpCardView } from "@/components/contests/lineupCardMapper";
import { ScoreBreakdownPanel, type BreakdownRow } from "@/components/contests/ScoreBreakdownPanel";
import { ContestResultPanel } from "@/components/contests/ContestResultPanel";
import type { ContestStatus, LineupOption } from "@/components/contests/types";


function formatRewardParts(input: { pointsAmount: number; xpAmount: number; packsCount: number }) {
  return [
    input.pointsAmount > 0 ? `${input.pointsAmount.toLocaleString()} pts` : null,
    input.xpAmount > 0 ? `${input.xpAmount.toLocaleString()} XP` : null,
    input.packsCount > 0 ? `${input.packsCount.toLocaleString()} pack${input.packsCount > 1 ? "s" : ""}` : null,
  ].filter((value): value is string => Boolean(value));
}

function formatRewardSummary(input: { pointsAmount: number; xpAmount: number; packsCount: number }) {
  const parts = formatRewardParts(input);
  return parts.length > 0 ? parts.join(" • ") : "No rewards";
}

function parseTierRank(label: string) {
  const match = label.match(/#(\d+)/);
  return match ? Number(match[1]) : null;
}

type RewardDisplayTier = {
  rankStart: number | null;
  rankEnd: number | null;
  label: string;
  bundleName: string;
  pointsAmount: number;
  xpAmount: number;
  packsCount: number;
  winnerLabel?: string | null;
};

function groupRewardTiers(tiers: RewardTier[]): RewardDisplayTier[] {
  const groups: RewardDisplayTier[] = [];

  for (const tier of tiers) {
    const rank = parseTierRank(tier.label);
    const previous = groups[groups.length - 1] ?? null;
    const sameRewardShape = previous
      && previous.bundleName === tier.bundleName
      && previous.pointsAmount === tier.pointsAmount
      && previous.xpAmount === tier.xpAmount
      && previous.packsCount === tier.packsCount
      && previous.rankEnd !== null
      && rank !== null
      && previous.rankEnd + 1 === rank;

    if (sameRewardShape) {
      previous.rankEnd = rank;
      previous.label = previous.rankStart === previous.rankEnd ? `Rank ${previous.rankStart}` : `Ranks ${previous.rankStart}-${previous.rankEnd}`;
      continue;
    }

    groups.push({
      rankStart: rank,
      rankEnd: rank,
      label: rank !== null ? `Rank ${rank}` : tier.label,
      bundleName: tier.bundleName,
      pointsAmount: tier.pointsAmount,
      xpAmount: tier.xpAmount,
      packsCount: tier.packsCount,
      winnerLabel: tier.winnerLabel ?? null,
    });
  }

  return groups;
}

function buildOpenRewardPool(tiers: RewardTier[], summary?: {
  pointsPool: number;
  packPool: number;
  rewardedTopPercent: number;
  rewardedWinners: number;
  participantCount: number;
} | null) {
  if (summary) {
    return {
      pointsPool: summary.pointsPool,
      packPool: summary.packPool,
      rewardedTopPercent: summary.rewardedTopPercent,
      rewardedWinners: summary.rewardedWinners,
      participantCount: summary.participantCount,
    };
  }

  return {
    pointsPool: tiers.reduce((sum, tier) => sum + Math.max(0, tier.pointsAmount), 0),
    packPool: tiers.reduce((sum, tier) => sum + Math.max(0, tier.packsCount), 0),
    rewardedTopPercent: null,
    rewardedWinners: tiers.length,
    participantCount: null,
  };
}

export type RewardTier = {
  label: string;
  bundleName: string;
  pointsAmount: number;
  xpAmount: number;
  packsCount: number;
  winnerLabel?: string | null;
};

export type RewardSummary = {
  pointsTotal: number;
  xpTotal: number;
  packsTotal: number;
};

export type HeroPanelProps = {
  title: string;
  status: ContestStatus;
  coverImageUrl?: string | null;
  infoLine: string;
  contextBody: string;
  timing: {
    label: string;
    value: string;
    helper: string;
    details: Array<{ label: string; value: string }>;
  };
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean } | null;
  flash?: string | null;
  error?: string | null;
};

export function HeroPanel({
  title,
  status,
  coverImageUrl,
  infoLine,
  contextBody,
  timing,
  primaryAction,
  flash,
  error,
}: HeroPanelProps) {
  const statusTone = status === "LIVE" ? "live" : status === "LOCKED" ? "locked" : status === "SETTLED" ? "settled" : "open";
  const hasCoverImage = Boolean(coverImageUrl && coverImageUrl.trim().length > 0);
  const infoItems = infoLine.split("•").map((item) => item.trim()).filter(Boolean);
  const heroCoverStyle = hasCoverImage
    ? { backgroundImage: `linear-gradient(108deg, rgba(5, 9, 20, 0.92) 0%, rgba(6, 10, 20, 0.74) 34%, rgba(7, 11, 24, 0.38) 66%, rgba(7, 11, 24, 0.18) 100%), url(${coverImageUrl})` }
    : undefined;

  return (
    <Surface className="contest-detail-shell-hero" variant="raised">
      <div className={`contest-detail-hero-visual${hasCoverImage ? " has-image" : " is-fallback"}`} style={heroCoverStyle}>
        <div className="contest-detail-hero-visual-badge-row">
          <span className={`mcg-badge ${statusTone}`}>{status}</span>
        </div>

        <div className="contest-detail-hero-copy">
          <div className="contest-detail-hero-copy-panel">
            <p className="contest-detail-hero-kicker">Contest spotlight</p>
            <h1>{title}</h1>
            {infoItems.length > 0 ? (
              <div className="contest-detail-hero-meta-list" aria-label="Contest quick facts">
                {infoItems.map((item) => (
                  <span key={item} className="contest-detail-hero-meta-pill">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="contest-detail-hero-info-line">{infoLine}</p>
            )}
            <p className="contest-detail-hero-context-line">{contextBody}</p>
            {error ? <p className="contest-detail-inline-alert error">{error}</p> : null}
            {!error && flash ? <p className="contest-detail-inline-alert success">{flash}</p> : null}
          </div>
        </div>
      </div>

      <div className="contest-detail-hero-side">
        <div className={`contest-detail-timing-panel status-${status.toLowerCase()}`}>
          <div className="contest-detail-timing-header">
            <span className="contest-detail-timing-label">{timing.label}</span>
            <strong>{timing.value}</strong>
            <p>{timing.helper}</p>
          </div>

          {timing.details.length > 0 ? (
            <div className="contest-detail-timing-details">
              {timing.details.map((item) => (
                <div key={`${item.label}-${item.value}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {primaryAction ? (
          <div className="contest-detail-hero-action-panel">
            <button type="button" className="mcg-btn primary contest-detail-hero-cta" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
              {primaryAction.label}
            </button>
          </div>
        ) : null}
      </div>
    </Surface>
  );
}

function InlineLeaderboard({
  rows,
  currentUserId,
  compact = false,
}: {
  rows: LeaderboardRow[];
  currentUserId?: string;
  compact?: boolean;
}) {
  if (rows.length === 0) return <p className="contest-detail-empty-note">Ranking pending.</p>;

  const previewRows = compact ? rows.slice(0, 5) : rows;
  return (
    <div className="contest-detail-leaderboard-list">
      {previewRows.map((row) => (
        <div key={row.id} className={`contest-detail-leaderboard-row ${row.userId === currentUserId ? "is-me" : ""} ${row.rank <= 3 && !compact ? "is-top" : ""}`}>
          <span className="mono">#{row.rank}</span>
          <span>{row.userId === currentUserId ? "You" : row.displayName}</span>
          <strong className="mono">{row.score.toFixed(2)}</strong>
        </div>
      ))}
    </div>
  );
}

function InlineScoreBreakdown({ rows }: { rows: BreakdownRow[] }) {
  if (rows.length === 0) return <p className="contest-detail-empty-note">Per-card scoring is not available yet.</p>;

  return (
    <div className="contest-breakdown-list">
      {rows.map((row) => (
        <div key={row.id} className={`contest-breakdown-row${row.dataQuality === "INCOMPLETE" ? " is-incomplete" : ""}`}>
          <div className="contest-breakdown-card">
            <strong>{row.cardInstance.cardTemplate.name}</strong>
            <span>{row.tokenProject.displayName}</span>
            {row.cardInstance.cardTemplate.rarity ? <span className="mcg-badge">{row.cardInstance.cardTemplate.rarity.code}</span> : null}
            {row.cardInstance.cardTemplate.edition ? <span className="mcg-badge">{row.cardInstance.cardTemplate.edition.code}</span> : null}
            {row.dataQuality === "INCOMPLETE" ? <span className="mcg-badge is-warn">Incomplete data</span> : null}
          </div>
          <div className="contest-breakdown-scores">
            <span>Base {row.baseScore.toFixed(2)}</span>
            <span>×{row.rarityMultiplier.toFixed(2)}</span>
            <span>×{row.editionMultiplier.toFixed(2)}</span>
            <strong>= {row.finalScore.toFixed(2)}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MainStateBlock({
  status,
  title,
  body,
  summaryItems,
  rankingRows,
  currentUserId,
  myRank,
  myScore,
  myRewards,
  scoreBreakdown,
  lineup,
}: {
  status: ContestStatus;
  title: string;
  body: string;
  summaryItems: Array<{ label: string; value: string }>;
  rankingRows: LeaderboardRow[];
  currentUserId?: string;
  myRank?: number | null;
  myScore?: number | null;
  myRewards?: RewardSummary | null;
  scoreBreakdown?: BreakdownRow[] | null;
  lineup: ReactNode;
}) {
  const statusLabel = status === "OPEN" ? "Entry flow" : status === "LOCKED" ? "Locked lineup" : status === "LIVE" ? "Live contest" : "Final result";
  const rewardSummary = myRewards
    ? [
        myRewards.pointsTotal > 0 ? `${myRewards.pointsTotal} pts` : null,
        myRewards.xpTotal > 0 ? `${myRewards.xpTotal} XP` : null,
        myRewards.packsTotal > 0 ? `${myRewards.packsTotal} pack${myRewards.packsTotal > 1 ? "s" : ""}` : null,
      ].filter((value): value is string => Boolean(value)).join(" • ")
    : "";

  return (
    <Surface id="contest-main-experience" className="contest-detail-block contest-detail-main-surface" variant="raised">
      <div className="contest-detail-block-head">
        <div>
          <p className="mcg-eyebrow">{statusLabel}</p>
          <h3>{title}</h3>
        </div>
      </div>

      <p className="contest-detail-panel-copy">{body}</p>

      {status === "SETTLED" ? (
        <div className="contest-detail-result-lead">
          <p className="mcg-eyebrow">Result</p>
          <strong>{myRank ? `#${myRank}` : "—"}</strong>
          <div className="contest-detail-result-rail">
            <span>
              <strong>{typeof myScore === "number" ? myScore.toFixed(2) : "—"}</strong>
              <small>Score</small>
            </span>
            <span>
              <strong>{rewardSummary || "No rewards"}</strong>
              <small>Rewards</small>
            </span>
          </div>
        </div>
      ) : summaryItems.length > 0 ? (
        <div className="contest-detail-main-inline-summary">
          {summaryItems.map((item) => (
            <span key={item.label}>
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </span>
          ))}
        </div>
      ) : null}

      <section className="contest-detail-main-section lineup-subsection">
        <div className="contest-detail-section-head">
          <div>
            <p className="mcg-eyebrow">{status === "LIVE" ? "Your lineup" : status === "SETTLED" ? "Final lineup" : "Lineup"}</p>
            <h4>{status === "OPEN" ? "Build your entry" : status === "LOCKED" ? "Locked entry" : status === "LIVE" ? "Live lineup" : "Cards that counted"}</h4>
          </div>
        </div>
        {lineup}
      </section>

      {status === "SETTLED" ? (
        <section className="contest-detail-main-section">
          <div className="contest-detail-section-head">
            <div>
              <p className="mcg-eyebrow">Score breakdown</p>
              <h4>How your final score was built</h4>
            </div>
          </div>
          <InlineScoreBreakdown rows={scoreBreakdown ?? []} />
        </section>
      ) : null}

      {status === "LIVE" || status === "SETTLED" ? (
        <section className="contest-detail-main-section">
          <div className="contest-detail-section-head">
            <div>
              <p className="mcg-eyebrow">{status === "SETTLED" ? "Leaderboard" : "Standings"}</p>
              <h4>{status === "SETTLED" ? "Final leaderboard" : "Live leaderboard"}</h4>
            </div>
          </div>
          <InlineLeaderboard rows={rankingRows} currentUserId={currentUserId} />
        </section>
      ) : null}

      {(status === "OPEN" || status === "LOCKED") && rankingRows.length > 0 ? (
        <section className="contest-detail-main-section">
          <div className="contest-detail-section-head">
            <div>
              <p className="mcg-eyebrow">{status === "OPEN" ? "Field snapshot" : "Early standings"}</p>
              <h4>{status === "OPEN" ? "Who is already in" : "Leaderboard preview"}</h4>
            </div>
          </div>
          <InlineLeaderboard rows={rankingRows} currentUserId={currentUserId} compact />
        </section>
      ) : null}
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
  embedded?: boolean;
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
  embedded = false,
}: LineupPanelProps) {
  const slotCountClass = rosterSize >= 6 ? "dense" : rosterSize === 5 ? "balanced" : "wide";
  const hasLineup = slotCards.some(Boolean);
  const content = (
    <>
      {embedded ? (
        <div className="contest-detail-lineup-meta">
          <div className="contest-detail-lineup-headline">
            <div>
              <p className="mcg-eyebrow">Lineup</p>
              {title ? <h3>{title}</h3> : null}
            </div>
            <div className="contest-detail-lineup-progress">
              <strong>{selectedCount} / {rosterSize}</strong>
              <span>{label}</span>
            </div>
          </div>
          <div className="contest-detail-lineup-progress-bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (selectedCount / Math.max(rosterSize, 1)) * 100)}%` }} />
          </div>
          <p className="contest-detail-panel-copy">{helperText}</p>
        </div>
      ) : (
        <>
          <div className="contest-detail-block-head">
            <div>
              <p className="mcg-eyebrow">Lineup</p>
              {title ? <h3>{title}</h3> : null}
            </div>
            <div className="contest-detail-block-head-meta">
              <span className="mcg-chip">{label}</span>
              <span className="contest-detail-inline-note">{selectedCount}/{rosterSize} selected</span>
            </div>
          </div>

          <p className="contest-detail-panel-copy">{helperText}</p>
        </>
      )}

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
                <span className="contest-detail-lineup-slot-label">Slot {index + 1}</span>
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
              <span className="contest-detail-lineup-slot-label">Slot {index + 1}</span>
              {cardView ? <MvpCardTile card={cardView} variant="canonical" interactive={false} /> : <span className="contest-command-slot-missing">Card preview unavailable</span>}
              {(isLocked || isLive) ? <span className="contest-detail-slot-note">Locked</span> : null}
              {isSettled ? <span className="contest-detail-slot-note">{slotCard.finalScore !== null ? `${slotCard.finalScore.toFixed(2)} pts` : "—"}</span> : null}
            </button>
          );
        })}
      </div>

      {!hasLineup && !isOpen ? <p className="contest-detail-empty-note">{emptyMessage ?? "No lineup was submitted for this contest."}</p> : null}
    </>
  );

  if (embedded) return <div className="contest-detail-lineup-embed">{content}</div>;

  return <Surface className="contest-detail-block lineup-panel" variant="raised">{content}</Surface>;
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
  status,
  tiers,
  summary,
  hasPolicyData = false,
  myRewards,
}: {
  status: ContestStatus;
  tiers: RewardTier[];
  summary?: {
    pointsPool: number;
    packPool: number;
    rewardedTopPercent: number;
    rewardedWinners: number;
    participantCount: number;
  } | null;
  hasPolicyData?: boolean;
  myRewards?: RewardSummary | null;
}) {
  const isOpen = status === "OPEN" || status === "LOCKED";
  const isLive = status === "LIVE";
  const isSettled = status === "SETTLED";
  const hasEarnedRewards = Boolean(myRewards && (myRewards.pointsTotal > 0 || myRewards.xpTotal > 0 || myRewards.packsTotal > 0));
  const groupedTiers = groupRewardTiers(tiers);
  const openPool = buildOpenRewardPool(tiers, summary);
  const openPoolItems = [
    openPool.pointsPool > 0 ? { label: "Points pool", value: `${openPool.pointsPool.toLocaleString()} pts` } : null,
    openPool.packPool > 0 ? { label: "Pack pool", value: `${openPool.packPool.toLocaleString()} pack${openPool.packPool > 1 ? "s" : ""}` } : null,
    openPool.rewardedTopPercent ? { label: "Paid range", value: `Top ${openPool.rewardedTopPercent}% paid` } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const hasExactTierRows = groupedTiers.length > 0;

  return (
    <Surface className="contest-detail-block rewards-panel" variant="raised">
      <div className="contest-detail-block-head">
        <div>
          <p className="mcg-eyebrow">Rewards</p>
          <h3>{isOpen ? "Reward pool" : isLive ? "Live reward distribution" : "Final reward distribution"}</h3>
        </div>
      </div>

      {isOpen ? (
        openPoolItems.length > 0 ? (
          <>
            <p className="contest-detail-panel-copy">See the pool at a glance now. The exact payout table becomes relevant once the contest is live.</p>
            <div className="contest-detail-reward-pool-grid">
              {openPoolItems.map((item) => (
                <article key={item.label} className="contest-detail-reward-pool-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="contest-detail-empty-note">Rewards are still being published for this contest.</p>
        )
      ) : hasExactTierRows ? (
        <>
          <p className="contest-detail-panel-copy">
            {isSettled
              ? "Final placements are locked. Review the payout table below."
              : "Track the current payout by placement while the contest is live."}
          </p>

          {isSettled && myRewards ? (
            <div className="contest-detail-earned-rewards">
              <div className="contest-detail-earned-rewards-head">
                <strong>{hasEarnedRewards ? "Your rewards" : "Your result"}</strong>
                <span>{hasEarnedRewards ? formatRewardSummary({ pointsAmount: myRewards.pointsTotal, xpAmount: myRewards.xpTotal, packsCount: myRewards.packsTotal }) : "No rewards earned"}</span>
              </div>
            </div>
          ) : null}

          <div className="contest-detail-reward-tier-list contest-detail-reward-tier-table" role="table" aria-label={isSettled ? "Final reward payout table" : "Live reward payout table"}>
            <article className="contest-detail-reward-tier-table-head" role="row">
              <div className="contest-detail-reward-tier-rank" role="columnheader">
                <strong>Placement</strong>
                <span>{isSettled ? "Locked finish" : "Current payout band"}</span>
              </div>
              <div className="contest-detail-reward-tier-value" role="columnheader">
                <strong>Payout</strong>
                <span>{isSettled ? "Rewards earned" : "Exact reward bundle"}</span>
              </div>
            </article>
            {groupedTiers.map((tier, index) => {
              const rewardParts = formatRewardParts(tier);
              return (
                <article key={`${tier.label}-${index}`} role="row">
                  <div className="contest-detail-reward-tier-rank" role="cell">
                    <strong>{tier.label}</strong>
                    {tier.bundleName ? <span>{tier.bundleName}</span> : null}
                  </div>
                  <div className="contest-detail-reward-tier-value" role="cell">
                    <strong>{rewardParts.join(" • ") || "No rewards"}</strong>
                    {isSettled && tier.winnerLabel ? <span>{tier.winnerLabel}</span> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : isLive ? (
        <p className="contest-detail-empty-note">Exact live payouts are not available yet for this contest.</p>
      ) : hasPolicyData && summary ? (
        <>
          <p className="contest-detail-panel-copy">Reward pool configured. Exact payout rows will appear here once rank-based tiers are published.</p>
          <div className="contest-detail-reward-pool-grid">
            {openPoolItems.map((item) => (
              <article key={item.label} className="contest-detail-reward-pool-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="contest-detail-empty-note">Rewards are still being published for this contest.</p>
      )}
    </Surface>
  );
}

export function FactsLifecyclePanel_UNUSED({
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
