import type { CSSProperties } from "react";
import type { MvpCardView } from "@/types/cards";
import { getChainAccent, getEditionTheme, getFactionAccent, getRarityTheme, prettyEditionLabel } from "@/components/ui/mvpCardTheme";

type Props = {
  card: MvpCardView;
  quantity?: number;
};

const formatSupply = (card: MvpCardView) => `${card.issuedSupply}/${card.plannedSupply}`;

export function MvpCardTile({ card, quantity }: Props) {
  const rarityTheme = getRarityTheme(card.rarity);
  const editionTheme = getEditionTheme(card.edition);
  const factionColor = getFactionAccent(card.faction);
  const chainColor = getChainAccent(card.primaryChain);
  const isFullArt = card.edition.toUpperCase() === "FULL_ART";

  const cardStyle = {
    "--mvp-accent": rarityTheme.accent,
    "--mvp-glow": rarityTheme.glow,
    "--mvp-border": rarityTheme.border,
    "--mvp-badge": rarityTheme.badge,
    "--mvp-bg": editionTheme.treatment,
    "--mvp-sheen": editionTheme.sheen,
    "--mvp-foil": rarityTheme.foil,
    "--mvp-faction": factionColor,
    "--mvp-chain": chainColor,
  } as CSSProperties;

  return (
    <article className={`mvp-premium-card${isFullArt ? " mvp-full-art" : ""}`} style={cardStyle}>
      <div className="mvp-card-noise" />
      <div className="mvp-card-gloss" />
      <header className="mvp-card-header">
        <span className="mvp-token-symbol">{card.symbol}</span>
        <div className="mvp-header-badges">
          <span className="mvp-chip mvp-chip-rarity">{card.rarity}</span>
          <span className="mvp-chip mvp-chip-edition">{prettyEditionLabel(card.edition)}</span>
        </div>
      </header>

      <div className="mvp-card-title-zone">
        <h3 className="mvp-card-name">{card.displayName}</h3>
        <p className="mvp-card-slug">{card.slug}</p>
      </div>

      <div className="mvp-card-art-shell">
        <div className="mvp-card-art-glow" />
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt={card.displayName} loading="lazy" className="mvp-card-art" />
        ) : (
          <div className="mvp-card-art-placeholder">MCG</div>
        )}
      </div>

      <div className="mvp-meta-strip">
        <span>{card.primaryChain ?? "Unknown chain"}</span>
        <span>{card.faction ?? "Unaligned"}</span>
      </div>

      <footer className="mvp-card-footer">
        <div className="mvp-footer-cell">
          <span className="mvp-footer-label">Owned</span>
          <span className="mvp-footer-value">{quantity ?? card.instanceCount}</span>
        </div>
        <div className="mvp-footer-cell">
          <span className="mvp-footer-label">Supply</span>
          <span className="mvp-footer-value">{formatSupply(card)}</span>
        </div>
        <div className="mvp-footer-cell">
          <span className="mvp-footer-label">Remaining</span>
          <span className="mvp-footer-value">{card.remainingSupply}</span>
        </div>
      </footer>
    </article>
  );
}
