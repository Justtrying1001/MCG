import type { BaseCard } from "@/types/cards";

type Props = {
  card: BaseCard;
  quantity?: number;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
};

function rarityTone(card: BaseCard) {
  if ((card.marketCapRank ?? 9999) <= 10) return "legendary";
  if ((card.marketCapRank ?? 9999) <= 40) return "epic";
  return "rare";
}

export function CardFrame({ card, quantity, selectable, selected, onClick }: Props) {
  const tone = rarityTone(card);

  return (
    <article className={`tcg-card tone-${tone} ${selected ? "is-selected" : ""}`} onClick={onClick}>
      <div className="card-holo" />
      <header className="tcg-card-header">
        <strong>{card.name}</strong>
        <span>{card.symbol}</span>
      </header>
      <div className="art-zone">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.image} alt={card.name} loading="lazy" />
      </div>
      <div className="card-meta">
        <span>{card.faction || "Unknown"}</span>
        <span>Rank #{card.marketCapRank ?? "N/A"}</span>
      </div>
      <div className="stats-grid">
        <span>ATK {card.ATK}</span>
        <span>DEF {card.DEF}</span>
        <span>SPD {card.SPD}</span>
        <span>CTRL {card.CTRL}</span>
      </div>
      <footer className="card-footer">
        {typeof quantity === "number" ? <span>Owned: {quantity}</span> : <span>Collectible</span>}
        {selectable ? <span>{selected ? "✅ Team" : "+ Team"}</span> : null}
      </footer>
    </article>
  );
}
