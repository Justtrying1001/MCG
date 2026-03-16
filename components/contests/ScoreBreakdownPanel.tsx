import { Surface } from "@/components/ui/Surface";

export type BreakdownRow = {
  id: string;
  baseScore: number;
  rarityMultiplier: number;
  editionMultiplier: number;
  finalScore: number;
  dataQuality: string;
  tokenProject: { displayName: string; slug: string };
  cardInstance: { cardTemplate: { name: string; imageUrl: string | null; rarity: { code: string } | null; edition: { code: string } | null } };
};

export function ScoreBreakdownPanel({ rows }: { rows: BreakdownRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Surface className="contest-score-breakdown-panel" variant="raised">
      <p className="mcg-eyebrow">Score breakdown</p>
      <h4 className="mcg-title">Per-card scoring</h4>
      <div className="contest-breakdown-list">
        {rows.map((row) => (
          <div key={row.id} className={`contest-breakdown-row${row.dataQuality === "INCOMPLETE" ? " is-incomplete" : ""}`}>
            <div className="contest-breakdown-card">
              <strong>{row.cardInstance.cardTemplate.name}</strong>
              <span>{row.tokenProject.displayName}</span>
              {row.cardInstance.cardTemplate.rarity ? <span className="mcg-badge">{row.cardInstance.cardTemplate.rarity.code}</span> : null}
              {row.cardInstance.cardTemplate.edition ? <span className="mcg-badge">{row.cardInstance.cardTemplate.edition.code}</span> : null}
              {row.dataQuality === "INCOMPLETE" ? <span className="mcg-badge is-warn">Incomplete data</span> : null}
            </div>
            <div className="contest-breakdown-scores">
              <span>Base {row.baseScore.toFixed(2)}</span>
              <span>×{row.rarityMultiplier.toFixed(2)}</span>
              <span>×{row.editionMultiplier.toFixed(2)}</span>
              <strong>= {row.finalScore.toFixed(2)}</strong>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
