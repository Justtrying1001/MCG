import { Drawer } from "@/components/ui/Drawer";

type Row = { label: string; rate: number };

type PackOddsDrawerProps = {
  open: boolean;
  onClose: () => void;
  rarityRows: Row[];
  editionRows: Row[];
  remaining?: number;
  planned?: number;
};

export function PackOddsDrawer({ open, onClose, rarityRows, editionRows, remaining, planned }: PackOddsDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Odds & Supply">
      <div className="pack-odds-drawer">
        <div className="pack-odds-supply">
          <strong>Supply breakdown</strong>
          <p>
            {typeof remaining === "number" ? remaining.toLocaleString() : "—"} / {typeof planned === "number" ? planned.toLocaleString() : "—"}
          </p>
        </div>

        <div className="pack-odds-tables">
          <div>
            <h4>Rarity distribution</h4>
            <table className="pack-odds-table" aria-label="Rarity odds">
              <thead><tr><th>Rarity</th><th>Rate</th></tr></thead>
              <tbody>
                {rarityRows.slice(0, 6).map((row) => (
                  <tr key={row.label}><td>{row.label}</td><td>{row.rate}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4>Edition distribution</h4>
            <table className="pack-odds-table" aria-label="Edition odds">
              <thead><tr><th>Edition</th><th>Rate</th></tr></thead>
              <tbody>
                {editionRows.slice(0, 6).map((row) => (
                  <tr key={row.label}><td>{row.label}</td><td>{row.rate}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
