type Props = {
  compact?: boolean;
};

export function DocsLearnSection({ compact = false }: Props) {
  return (
    <section className={`home-docs-section${compact ? " home-docs-section--compact" : ""}`}>
      <div className="home-docs-panel">
        <div className="home-docs-content">
          <p className="home-docs-eyebrow">Docs</p>
          <h2 className="home-docs-title">Learn the game.</h2>
          <p className="home-docs-desc">
            Rules, packs, contests, and scoring in one place.
          </p>
        </div>
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
