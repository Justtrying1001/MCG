import type { BaseCard } from "@/types/cards";

type Props = {
  card: BaseCard;
  quantity?: number;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
};

function rarityTone(card: BaseCard): "legendary" | "epic" | "rare" | "common" {
  const rank = card.marketCapRank ?? 9999;
  if (rank <= 10) return "legendary";
  if (rank <= 40) return "epic";
  if (rank <= 100) return "rare";
  return "common";
}

const RARITY_LABELS: Record<string, string> = {
  legendary: "Legendary",
  epic: "Epic",
  rare: "Rare",
  common: "Common",
};

export function CardFrame({ card, quantity, selectable, selected, onClick }: Props) {
  const tone = rarityTone(card);

  return (
    <article
      className={`tcg-card tone-${tone}${selected ? " is-selected" : ""}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      <div className="card-holo" />

      <div className="card-inner">
        <div className="card-top-row">
          <span className="card-name">{card.name}</span>
          <span className="card-symbol">{card.symbol}</span>
        </div>

        <div className="art-zone">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.image} alt={card.name} loading="lazy" />
        </div>

        <div className="card-faction">{card.faction || "Unknown faction"}</div>

        <div className="stats-row">
          <div className="stat-cell">
            <span className="stat-cell-label">ATK</span>
            <span className="stat-cell-value">{card.ATK}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-cell-label">DEF</span>
            <span className="stat-cell-value">{card.DEF}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-cell-label">SPD</span>
            <span className="stat-cell-value">{card.SPD}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-cell-label">CTRL</span>
            <span className="stat-cell-value">{card.CTRL}</span>
          </div>
        </div>

        <div className="card-bottom-row">
          <span className="card-qty">
            {typeof quantity === "number" ? `×${quantity}` : `#${card.marketCapRank ?? "N/A"}`}
          </span>
          {selectable ? (
            <span className="select-indicator">{selected ? "✓ Team" : "+ Team"}</span>
          ) : (
            <span className={`rarity-badge rarity-${tone}`}>{RARITY_LABELS[tone]}</span>
          )}
        </div>
      </div>
    </article>
  );
}
