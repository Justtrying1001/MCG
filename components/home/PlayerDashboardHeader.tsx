import Link from "next/link";

type Props = {
  displayName: string;
  points: number;
  level?: number | null;
  packsOpened?: number | null;
  cardsOwned?: number | null;
  collectionCompletionPct?: number | null;
  contestsEntered?: number | null;
  activeEntries?: number | null;
  seasonRank?: number | null;
};

function shortenAddress(name: string): string {
  if (name.length > 16 && /^[a-zA-Z0-9]+$/.test(name)) {
    return `${name.slice(0, 6)}…${name.slice(-4)}`;
  }
  return name;
}

function formatMetric(value: number | null | undefined, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${value.toLocaleString()}${suffix}`;
}

export function PlayerDashboardHeader({
  displayName,
  points,
  level,
  packsOpened,
  cardsOwned,
  collectionCompletionPct,
  contestsEntered,
  activeEntries,
  seasonRank,
}: Props) {
  const chips = [
    typeof level === "number" ? `Level ${level}` : null,
    typeof collectionCompletionPct === "number" ? `${collectionCompletionPct}% collection` : null,
    typeof activeEntries === "number" ? `${activeEntries} active entries` : null,
    typeof seasonRank === "number" ? `Season rank #${seasonRank}` : null,
  ].filter(Boolean) as string[];

  const spotlightStats = [
    { label: "Packs opened", value: formatMetric(packsOpened) },
    { label: "Cards owned", value: formatMetric(cardsOwned) },
    { label: "Contests entered", value: formatMetric(contestsEntered) },
  ].filter((item) => item.value !== null);

  return (
    <section className="player-dash-header">
      <div className="player-dash-hero-row">
        <div className="player-dash-greeting">
          <p className="player-dash-kicker">Player hub</p>
          <p className="player-dash-gm">
            GM, <span className="player-dash-name">{shortenAddress(displayName)}</span>
          </p>
          <div className="player-dash-points">
            <span className="player-dash-points-value">
              {points.toLocaleString()}
            </span>
            <span className="player-dash-points-label">PTS</span>
          </div>
          <p className="player-dash-copy">
            Keep your loop moving with packs, contests, and your collection in one place.
          </p>
          {chips.length > 0 ? (
            <div className="player-dash-chip-row" aria-label="Player snapshot">
              {chips.map((chip) => (
                <span key={chip} className="player-dash-chip">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="player-dash-actions-card">
          <div className="player-dash-actions-copy">
            <span className="player-dash-actions-label">Main action</span>
            <strong>Open a pack to reveal new cards.</strong>
            <p>Then jump straight into contests or review your binder.</p>
          </div>
          <div className="player-dash-actions">
            <Link href="/packs" className="player-dash-btn player-dash-btn--primary">
              Open a pack
            </Link>
            <div className="player-dash-actions-secondary">
              <Link href="/contests" className="player-dash-btn player-dash-btn--secondary">
                Enter contest
              </Link>
              <Link href="/collection" className="player-dash-btn player-dash-btn--ghost">
                My collection
              </Link>
            </div>
          </div>
        </div>
      </div>

      {spotlightStats.length > 0 ? (
        <div className="player-dash-spotlight-grid" aria-label="Key account metrics">
          {spotlightStats.map((stat) => (
            <div key={stat.label} className="player-dash-spotlight-card">
              <span className="player-dash-spotlight-label">{stat.label}</span>
              <strong className="player-dash-spotlight-value">{stat.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
