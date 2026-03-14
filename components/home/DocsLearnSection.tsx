export function DocsLearnSection() {
  return (
    <section className="home-docs-section">
      <div className="home-docs-panel">
        <div className="home-docs-content">
          <p className="home-docs-eyebrow">New to MCG?</p>
          <h2 className="home-docs-title">Learn the game.</h2>
          <p className="home-docs-desc">
            Everything you need to know about cards, packs, contests, and
            scoring is in the docs.
          </p>
          <a
            href="https://mcg-2.gitbook.io/untitled/"
            target="_blank"
            rel="noopener noreferrer"
            className="home-docs-cta"
          >
            READ THE DOCS <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="home-docs-icon" aria-hidden="true">📖</div>
      </div>
    </section>
  );
}
