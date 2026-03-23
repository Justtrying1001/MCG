import Link from "next/link";

type Props = {
  displayName: string;
  points: number;
  level?: number | null;
  activeEntries?: number | null;
  completionPct?: number | null;
  ownedTemplates?: number | null;
  missingTemplates?: number | null;
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
  completionPct,
  ownedTemplates,
  missingTemplates,
  seasonRank,
}: Props) {
  const discoveredCount =
    typeof ownedTemplates === "number" ? ownedTemplates.toLocaleString() : "—";
  const completionLabel =
    typeof completionPct === "number" ? `${completionPct}%` : "—";
  const highlights = [
    typeof level === "number" ? `Level ${level}` : null,
    typeof seasonRank === "number" ? `Season rank #${seasonRank}` : null,
    typeof activeEntries === "number" && activeEntries > 0
      ? `${activeEntries} active entr${activeEntries > 1 ? "ies" : "y"}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <section className="player-dash-header stitch-console-panel">
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
                Trainer{" "}
                <span className="player-dash-name">
                  {shortenAddress(displayName)}
                </span>
              </p>
              <p className="player-dash-copy">
                Your handheld hub for contest runs, collection goals, quests,
                and the loudest moves happening across MCG.
              </p>
            </div>
          </div>

          <div className="player-dash-console-stack">
            <div
              className="player-dash-points-panel"
              aria-label="Player points"
            >
              <span className="player-dash-points-value">
                {points.toLocaleString()}
              </span>
              <span className="player-dash-points-label">Points bank</span>
            </div>

            <div
              className="player-dash-mini-stats"
              aria-label="Trainer progress"
            >
              <div className="player-dash-mini-stat">
                <span>Memedex</span>
                <strong>{completionLabel}</strong>
              </div>
              <div className="player-dash-mini-stat">
                <span>Owned</span>
                <strong>{discoveredCount}</strong>
              </div>
              <div className="player-dash-mini-stat">
                <span>Missing</span>
                <strong>
                  {typeof missingTemplates === "number"
                    ? missingTemplates.toLocaleString()
                    : "—"}
                </strong>
              </div>
            </div>
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
        <Link
          href="/contests"
          className="player-dash-btn player-dash-btn--primary"
        >
          Enter battle arena
        </Link>
        <div
          className="player-dash-secondary-links"
          aria-label="Secondary actions"
        >
          <Link
            href="/collection"
            className="player-dash-secondary-link player-dash-secondary-link--cyan"
          >
            Memedex
          </Link>
          <Link
            href="/packs"
            className="player-dash-secondary-link player-dash-secondary-link--yellow"
          >
            Open booster shop
          </Link>
          <Link
            href="/rewards"
            className="player-dash-secondary-link player-dash-secondary-link--white"
          >
            Quests
          </Link>
        </div>
      </div>
    </section>
  );
}
