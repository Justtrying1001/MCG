type Props = {
  compact?: boolean;
};

export function DocsLearnSection({ compact = false }: Props) {
  const eyebrow = compact ? "Docs" : "Get started";
  const title = compact ? "Learn the game." : "Join the collection obsession.";
  const description = compact
    ? "Rules, packs, contests, and scoring in one place."
    : "Learn the rules, understand scoring, and see how packs, collection progress, and contests connect before your first real run.";

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
          ) : null}
        </div>
        {!compact ? (
          <div className="home-docs-art" aria-hidden="true">
            <div className="home-docs-art-card home-docs-art-card--back" />
            <div className="home-docs-art-card home-docs-art-card--front">
              <div className="home-docs-art-badge">New season live!</div>
              <div className="home-docs-art-body">
                <strong>Own the memes.</strong>
                <span>Read the docs, then connect when you are ready to collect for real.</span>
              </div>
            </div>
          </div>
        ) : null}
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
