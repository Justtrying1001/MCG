import Link from "next/link";

type Props = {
  displayName: string;
  points: number;
  level?: number | null;
  activeEntries?: number | null;
  seasonRank?: number | null;
};

function shortenAddress(name: string): string {
  if (name.length > 16 && /^[a-zA-Z0-9]+$/.test(name)) {
    return `${name.slice(0, 6)}…${name.slice(-4)}`;
  }
  return name;
}

export function PlayerDashboardHeader({
  displayName,
  points,
  level,
  activeEntries,
  seasonRank,
}: Props) {
  const highlights = [
    typeof level === "number" ? `Level ${level}` : null,
    typeof seasonRank === "number" ? `Season rank #${seasonRank}` : null,
    typeof activeEntries === "number" && activeEntries > 0 ? `${activeEntries} active entr${activeEntries > 1 ? "ies" : "y"}` : null,
  ].filter(Boolean) as string[];

  return (
    <section className="player-dash-header">
      <div className="player-dash-hero-copy">
        <p className="player-dash-kicker">Lobby</p>
        <div className="player-dash-title-row">
          <div>
            <p className="player-dash-gm">
              Welcome back, <span className="player-dash-name">{shortenAddress(displayName)}</span>
            </p>
            <p className="player-dash-copy">
              Your command center for active contests, collection progress, and the latest relic reveals.
            </p>
          </div>

          <div className="player-dash-points-panel" aria-label="Player points">
            <span className="player-dash-points-value">{points.toLocaleString()}</span>
            <span className="player-dash-points-label">Points</span>
          </div>
        </div>

        {highlights.length > 0 ? (
          <div className="player-dash-chip-row" aria-label="Player snapshot">
            {highlights.map((chip) => (
              <span key={chip} className="player-dash-chip">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="player-dash-actions-row">
        <Link href="/packs" className="player-dash-btn player-dash-btn--primary">
          Open a pack
        </Link>
        <div className="player-dash-secondary-links" aria-label="Secondary actions">
          <Link href="/contests" className="player-dash-secondary-link">
            Browse contests
          </Link>
          <Link href="/collection" className="player-dash-secondary-link">
            View collection
          </Link>
        </div>
      </div>
    </section>
  );
}
