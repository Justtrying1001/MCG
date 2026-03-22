type Props = {
  compact?: boolean;
};

export function DocsLearnSection({ compact = false }: Props) {
  const eyebrow = compact ? "Lobby intel" : "Start guide";
  const title = compact ? "Learn the game." : "Enter with the guide.";
  const description = compact
    ? "Rules, packs, contests, and scoring in one place."
    : "Learn the rules, understand scoring, and see how packs, Memedex progress, and contests connect before your first real run.";

  return (
    <section className={`home-docs-section${compact ? " home-docs-section--compact" : ""}`}>
      <div className="home-docs-panel">
        <div className="home-docs-content">
          <p className="home-docs-eyebrow">{eyebrow}</p>
          <h2 className="home-docs-title">{title}</h2>
          <p className="home-docs-desc">{description}</p>
          {!compact ? (
            <div className="home-docs-points" aria-label="Landing support highlights">
              <span className="mcg-chip">Guest landing preserved</span>
              <span className="mcg-chip">Docs always available</span>
              <span className="mcg-chip">Responsive onboarding</span>
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
            <div className="home-docs-art-tag">Read before your first run</div>
            <div className="home-docs-art-card home-docs-art-card--back" />
            <div className="home-docs-art-card home-docs-art-card--front">
              <div className="home-docs-art-badge">New season live!</div>
              <div className="home-docs-art-body">
                <strong>Own the memes.</strong>
                <span>Read the docs, then connect when you are ready to collect for real.</span>
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
