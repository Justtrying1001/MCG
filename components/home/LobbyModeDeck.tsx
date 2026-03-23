import Link from "next/link";

type Props = {
  completionPct?: number | null;
  points: number;
  activeEntries?: number | null;
};

export function LobbyModeDeck({ completionPct, points, activeEntries }: Props) {
  const completionLabel =
    typeof completionPct === "number" ? `${completionPct}% synced` : "Sync pending";
  const entriesLabel =
    typeof activeEntries === "number" && activeEntries > 0
      ? `${activeEntries} active entr${activeEntries === 1 ? "y" : "ies"}`
      : "No active entries";

  return (
    <section className="mcg-surface raised lobby-mode-deck" aria-label="Quick mode deck">
      <div className="lobby-mode-deck-head">
        <p className="mcg-eyebrow">Quick select</p>
        <h2 className="mcg-title">Mode deck</h2>
        <p className="mcg-subtitle">
          Jump straight to your next collectible, quest, or pack run from the
          lobby.
        </p>
      </div>

      <div className="lobby-mode-deck-grid">
        <Link href="/collection" className="lobby-mode-card lobby-mode-card--cyan">
          <span className="lobby-mode-icon" aria-hidden="true">
            ▣
          </span>
          <div>
            <strong>Memedex mode</strong>
            <span>{completionLabel}</span>
          </div>
        </Link>

        <Link href="/rewards" className="lobby-mode-card lobby-mode-card--yellow">
          <span className="lobby-mode-icon" aria-hidden="true">
            ★
          </span>
          <div>
            <strong>Quest board</strong>
            <span>{points.toLocaleString()} points banked</span>
          </div>
        </Link>

        <Link href="/packs" className="lobby-mode-card lobby-mode-card--pink">
          <span className="lobby-mode-icon" aria-hidden="true">
            ✦
          </span>
          <div>
            <strong>Booster shop</strong>
            <span>{entriesLabel}</span>
          </div>
        </Link>
      </div>
    </section>
  );
}
