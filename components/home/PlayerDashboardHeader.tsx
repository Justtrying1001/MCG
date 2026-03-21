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
        <p className="player-dash-kicker">Lobby main menu</p>
        <div className="player-dash-title-row">
          <div className="player-dash-identity-block">
            <div className="player-dash-avatar" aria-hidden="true">
              <span>{displayName.slice(0, 1).toUpperCase()}</span>
              {typeof level === "number" ? <strong>Lvl {level}</strong> : null}
            </div>
            <div>
              <p className="player-dash-gm">
                Trainer <span className="player-dash-name">{shortenAddress(displayName)}</span>
              </p>
              <p className="player-dash-copy">
                Your lobby for contests, collection momentum, and the freshest activity across MCG.
              </p>
            </div>
          </div>

          <div className="player-dash-points-panel" aria-label="Player points">
            <span className="player-dash-points-value">{points.toLocaleString()}</span>
            <span className="player-dash-points-label">Points bank</span>
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
