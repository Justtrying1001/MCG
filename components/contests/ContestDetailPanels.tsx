import type { ReactNode } from "react";
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
  countdownLabel: string;
  countdownValue: string;
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
  countdownLabel,
  countdownValue,
  primaryAction,
  flash,
  error,
}: HeroPanelProps) {
  const statusTone = status === "LIVE" ? "live" : status === "LOCKED" ? "locked" : status === "SETTLED" ? "settled" : "open";
  const hasCoverImage = Boolean(coverImageUrl && coverImageUrl.trim().length > 0);
  const heroCoverStyle = hasCoverImage
    ? { backgroundImage: `linear-gradient(102deg, rgba(4, 9, 20, 0.96) 0%, rgba(6, 10, 20, 0.92) 34%, rgba(7, 11, 24, 0.68) 58%, rgba(7, 11, 24, 0.34) 100%), url(${coverImageUrl})` }
    : undefined;

  return (
    <Surface className="contest-detail-shell-hero" variant="raised">
      <div className={`contest-detail-hero-visual${hasCoverImage ? " has-image" : " is-fallback"}`} style={heroCoverStyle}>
        <div className="contest-detail-hero-visual-badge-row">
          <span className={`mcg-badge ${statusTone}`}>{status}</span>
        </div>

        <div className="contest-detail-hero-copy">
          <div className="contest-detail-hero-copy-panel">
            <h1>{title}</h1>
            <p className="contest-detail-hero-info-line">{infoLine}</p>
            <p className="contest-detail-hero-context-line">{contextBody}</p>
            {error ? <p className="contest-detail-inline-alert error">{error}</p> : null}
            {!error && flash ? <p className="contest-detail-inline-alert success">{flash}</p> : null}
          </div>
        </div>
      </div>

      <div className="contest-detail-hero-side">
        <div className="contest-detail-countdown-block">
          <div className="contest-detail-hero-side-top">
            <span className="contest-detail-hero-side-label">{countdownLabel}</span>
          </div>
          <strong>{countdownValue}</strong>
          <small>{status === "SETTLED" ? "Results are locked in." : "Stay ahead of lock and live scoring."}</small>
        </div>

        {primaryAction ? (
          <button type="button" className="mcg-btn primary contest-detail-hero-cta" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
            {primaryAction.label}</button>
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

export function CompactSupportBlock({
  status,
  participants,
  entryFee,
  lifecycleLabel,
  tiers,
  myRewards,
  extraItems = [],
}: {
  status: ContestStatus;
  participants: number;
  entryFee: string;
  lifecycleLabel: string;
  tiers: RewardTier[];
  myRewards?: RewardSummary | null;
  extraItems?: Array<{ label: string; value: string }>;
}) {
  const featuredTier = tiers[0] ?? null;
  const earnedRewards = myRewards && (myRewards.pointsTotal > 0 || myRewards.xpTotal > 0 || myRewards.packsTotal > 0)
    ? [
        myRewards.pointsTotal > 0 ? `${myRewards.pointsTotal} pts` : null,
        myRewards.xpTotal > 0 ? `${myRewards.xpTotal} XP` : null,
        myRewards.packsTotal > 0 ? `${myRewards.packsTotal} pack${myRewards.packsTotal > 1 ? "s" : ""}` : null,
      ].filter((value): value is string => Boolean(value))
    : [];
  const rewardSummary = status === "SETTLED"
    ? earnedRewards.join(" • ") || "No rewards"
    : featuredTier
      ? `${featuredTier.label}${featuredTier.pointsAmount > 0 ? ` • ${featuredTier.pointsAmount} pts` : ""}${featuredTier.packsCount > 0 ? ` • ${featuredTier.packsCount} pack${featuredTier.packsCount > 1 ? "s" : ""}` : ""}`
      : "Rewards pending";
  const supportItems = [
    { label: "Rewards", value: rewardSummary },
    { label: "Players", value: String(participants) },
    { label: "Entry", value: entryFee },
    { label: "Status", value: lifecycleLabel },
    ...extraItems,
  ];

  return (
    <Surface className="contest-detail-block contest-detail-support-surface" variant="raised">
      <ul className="contest-detail-support-list">
        {supportItems.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
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
  tiers,
  summary,
  hasPolicyData = false,
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
  hasPolicyData?: boolean;
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
                <div>
                  {tier.winnerLabel ? <span>{tier.winnerLabel}</span> : null}
                  {tier.bundleName ? <span>{tier.bundleName}</span> : null}
                </div>
              </header>
              <div>
                {tier.pointsAmount > 0 ? <span>{tier.pointsAmount} pts</span> : null}
                {tier.xpAmount > 0 ? <span>{tier.xpAmount} XP</span> : null}
                {tier.packsCount > 0 ? <span>{tier.packsCount} pack{tier.packsCount > 1 ? "s" : ""}</span> : null}
              </div>
            </article>
          ))}
        </div>
      ) : hasPolicyData && summary ? (
        <div className="contest-detail-reward-tier-list">
          <article className="featured">
            <header>
              <strong>Reward pool configured</strong>
              <span>Field-dependent</span>
            </header>
            <div>
              {summary.pointsPool > 0 ? <span>{summary.pointsPool} pts pool</span> : null}
              {summary.packPool > 0 ? <span>{summary.packPool} pack{summary.packPool > 1 ? "s" : ""} pool</span> : null}
              <span>Top {summary.rewardedTopPercent}% paid</span>
            </div>
          </article>
        </div>
      ) : (
        <p className="contest-detail-empty-note">Rewards are still being published for this contest.</p>
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
