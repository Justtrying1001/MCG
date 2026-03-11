import type { MvpCardView } from "@/types/cards";

type Props = {
  card: MvpCardView;
  quantity?: number;
};

export function MvpCardTile({ card, quantity }: Props) {
  return (
    <article className="contest-card" style={{ minHeight: "220px" }}>
      <div className="contest-card-top">
        <p className="contest-code">{card.symbol}</p>
        <span className="contest-status status-open">{card.rarity} · {card.edition}</span>
      </div>
      <h3 className="contest-title">{card.displayName}</h3>
      <p className="contest-inline-note">Slug: {card.slug}</p>
      <p className="contest-inline-note">Chain: {card.primaryChain ?? "—"} · Faction: {card.faction ?? "—"}</p>
      <p className="contest-inline-note">Supply: {card.issuedSupply}/{card.plannedSupply} (remaining {card.remainingSupply})</p>
      <p className="contest-inline-note">Instances owned: {quantity ?? card.instanceCount}</p>
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.imageUrl}
          alt={card.displayName}
          style={{ width: "100%", maxHeight: "120px", objectFit: "contain", marginTop: "0.75rem" }}
          loading="lazy"
        />
      ) : null}
    </article>
  );
}
