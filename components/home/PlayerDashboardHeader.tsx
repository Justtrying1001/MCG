import Link from "next/link";

type Props = {
  displayName: string;
  points: number;
};

function shortenAddress(name: string): string {
  // If it looks like an address (long hex-ish), shorten it; otherwise show as-is
  if (name.length > 16 && /^[a-zA-Z0-9]+$/.test(name)) {
    return `${name.slice(0, 6)}…${name.slice(-4)}`;
  }
  return name;
}

export function PlayerDashboardHeader({ displayName, points }: Props) {
  return (
    <section className="player-dash-header">
      <div className="player-dash-greeting">
        <p className="player-dash-gm">
          GM, <span className="player-dash-name">{shortenAddress(displayName)}</span>
        </p>
        <div className="player-dash-points">
          <span className="player-dash-points-value">
            {points.toLocaleString()}
          </span>
          <span className="player-dash-points-label">PTS</span>
        </div>
      </div>

      <div className="player-dash-actions">
        <Link href="/packs" className="player-dash-btn player-dash-btn--primary">
          OPEN A PACK
        </Link>
        <Link href="/contests" className="player-dash-btn player-dash-btn--secondary">
          ENTER CONTEST
        </Link>
        <Link href="/collection" className="player-dash-btn player-dash-btn--ghost">
          MY COLLECTION
        </Link>
      </div>
    </section>
  );
}
