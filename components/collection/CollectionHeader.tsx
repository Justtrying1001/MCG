import { Surface } from "@/components/ui/Surface";

type CountRow = {
  label: string;
  count: number;
};

type CollectionHeaderProps = {
  completionPct: number | null;
  totalCards: number;
  uniqueCards: number;
  duplicateCount: number;
  rarityCounts: CountRow[];
  finishCounts: CountRow[];
  totalTemplates?: number | null;
  completionWidth?: number;
};

export function CollectionHeader({
  completionPct,
  totalCards,
  uniqueCards,
  duplicateCount,
  rarityCounts,
  finishCounts,
  totalTemplates = null,
  completionWidth = completionPct === null
    ? 12
    : Math.max(6, Math.min(100, completionPct)),
}: CollectionHeaderProps) {
  const completionLabel = completionPct === null ? "—" : `${completionPct.toFixed(2)}%`;
  const ownedLabel =
    typeof totalTemplates === "number" && totalTemplates > 0
      ? `${uniqueCards.toLocaleString()} / ${totalTemplates.toLocaleString()}`
      : `${uniqueCards.toLocaleString()} / —`;

  return (
    <Surface
      variant="raised"
      className="memedex-header-shell stitch-panel-card"
    >
      <div className="collection-header-wrap memedex-header-wrap">
        <div className="memedex-header-copy">
          <div className="memedex-header-title-row">
            <p className="memedex-header-eyebrow">Collection</p>
            <h1 className="memedex-header-title">Memedex</h1>
          </div>
          <p className="memedex-header-summary" aria-label="Memedex completion and ownership summary">
            <span><strong>{completionLabel}</strong> completion</span>
            <span><strong>{ownedLabel}</strong> owned / total</span>
          </p>
          <div className="memedex-header-section-grid">
            <div className="memedex-header-section" aria-label="Rarity breakdown">
              <span className="memedex-header-section-label">Rarity</span>
              <div className="memedex-header-inline-list">
                {rarityCounts.map((row) => (
                  <span key={row.label} className="memedex-header-pill">
                    <strong>{row.count.toLocaleString()}</strong>
                    <span>{row.label}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="memedex-header-section" aria-label="Finish breakdown">
              <span className="memedex-header-section-label">Finish</span>
              <div className="memedex-header-inline-list">
                {finishCounts.map((row) => (
                  <span key={row.label} className="memedex-header-pill">
                    <strong>{row.count.toLocaleString()}</strong>
                    <span>{row.label}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="memedex-header-section" aria-label="Duplicate count">
              <span className="memedex-header-section-label">Duplicates</span>
              <div className="memedex-header-inline-list">
                <span className="memedex-header-pill memedex-header-pill--accent">
                  <strong>{duplicateCount.toLocaleString()}</strong>
                  <span>Total duplicate cards</span>
                </span>
                <span className="memedex-header-inline-note">
                  {totalCards.toLocaleString()} copies tracked overall
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="memedex-header-progress"
          aria-label="Memedex completion progress"
        >
          <div className="memedex-header-progress-top">
            <span>Collection fill</span>
            <strong>{completionLabel}</strong>
          </div>
          <div
            className="collection-progress-track memedex-header-track"
            aria-hidden="true"
          >
            <span style={{ width: `${completionWidth}%` }} />
          </div>
          <p>
            {uniqueCards.toLocaleString()} unique cards cataloged across {totalCards.toLocaleString()} owned copies.
          </p>
        </div>
      </div>
    </Surface>
  );
}
