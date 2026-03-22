type Props = {
  compact?: boolean;
};

export function DocsLearnSection({ compact = false }: Props) {
  const eyebrow = compact ? "Lobby intel" : "Guide";
  const title = compact ? "Learn the game." : "Start smart";
  const description = compact
    ? "Rules, packs, contests, and scoring in one place."
    : "Rules, scoring, and pack basics without the clutter.";

  return (
    <section className={`home-docs-section${compact ? " home-docs-section--compact" : ""}`}>
      <div className="home-docs-panel">
        <div className="home-docs-content">
          <p className="home-docs-eyebrow">{eyebrow}</p>
          <h2 className="home-docs-title">{title}</h2>
          <p className="home-docs-desc">{description}</p>
          {!compact ? (
            <div className="home-docs-points" aria-label="Landing support highlights">
              <span className="mcg-chip">Rules</span>
              <span className="mcg-chip">Scoring</span>
              <span className="mcg-chip">Packs</span>
            </div>
          ) : (
            <div className="home-docs-points home-docs-points--compact" aria-label="Dashboard support highlights">
              <span className="mcg-chip">Contest rules</span>
              <span className="mcg-chip">Pack odds</span>
              <span className="mcg-chip">Scoring guide</span>
            </div>
          )}
        </div>
        {!compact ? (
          <div className="home-docs-art" aria-hidden="true">
            <div className="home-docs-art-card home-docs-art-card--back" />
            <div className="home-docs-art-card home-docs-art-card--front">
              <div className="home-docs-art-badge">Quick start</div>
              <div className="home-docs-art-body">
                <strong>Know the loop.</strong>
                <span>Read the essentials, then jump into your first run.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="home-docs-art home-docs-art--compact" aria-hidden="true">
            <div className="home-docs-art-card home-docs-art-card--front home-docs-art-card--compact">
              <div className="home-docs-art-badge">Lobby guide</div>
              <div className="home-docs-art-body">
                <strong>Need a refresher?</strong>
                <span>Open the docs for scoring, contest timing, and pack fundamentals.</span>
              </div>
            </div>
          </div>
        )}
        <a
          href="https://mcg-2.gitbook.io/mcg/"
          target="_blank"
          rel="noopener noreferrer"
          className="home-docs-cta"
        >
          Read docs <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
