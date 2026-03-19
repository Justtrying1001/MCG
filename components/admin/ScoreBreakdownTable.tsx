"use client";

type BreakdownRow = {
  id: string;
  entry: {
    id: string;
    userId: string;
    user?: { displayName: string | null; xUsername: string | null };
  };
  tokenProject: { displayName: string; slug?: string };
  cardInstance: { cardTemplate: { name: string; rarity?: { code: string } | null; edition?: { code: string } | null } };
  baseScore: number;
  rarityMultiplier: number;
  editionMultiplier: number;
  finalScore: number;
};

export function ScoreBreakdownTable({ breakdownRows }: { breakdownRows: BreakdownRow[] }) {
  if (breakdownRows.length === 0) {
    return <p className="admin-muted">No score breakdown rows available.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Entry</th>
            <th>Card</th>
            <th>Token</th>
            <th>Rarity</th>
            <th>Edition</th>
            <th>Token Score</th>
            <th>Rarity Mult.</th>
            <th>Edition Mult.</th>
            <th>Card Score</th>
          </tr>
        </thead>
        <tbody>
          {breakdownRows.map((row) => {
            const entryLabel = row.entry.user?.displayName?.trim()
              || row.entry.user?.xUsername
              || row.entry.userId;
            return (
              <tr key={row.id}>
                <td>{entryLabel}</td>
                <td>{row.cardInstance.cardTemplate.name}</td>
                <td>{row.tokenProject.displayName}</td>
                <td>{row.cardInstance.cardTemplate.rarity?.code ?? "—"}</td>
                <td>{row.cardInstance.cardTemplate.edition?.code ?? "—"}</td>
                <td>{row.baseScore.toFixed(2)}</td>
                <td>{row.rarityMultiplier.toFixed(2)}x</td>
                <td>{row.editionMultiplier.toFixed(2)}x</td>
                <td><strong>{row.finalScore.toFixed(2)}</strong></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
