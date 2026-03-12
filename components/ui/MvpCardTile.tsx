import type { CSSProperties } from "react";
import type { MvpCardView } from "@/types/cards";
import {
  getCardFrameTheme,
  getChainAccent,
  getEditionTheme,
  getEditionThemeKey,
  getFactionAccent,
  getRarityOrnament,
  getRarityTheme,
  prettyEditionLabel,
} from "@/components/ui/mvpCardTheme";

type Props = {
  card: MvpCardView;
  quantity?: number;
  size?: "collection" | "reveal";
};

const DEFAULT_SET_NAME = "GENESIS";
const DEFAULT_SET_EDITION = "Edition 1";

const padCardNumber = (value: number) => value.toString().padStart(3, "0");

const getPrintedCardNumber = (card: MvpCardView) => {
  if (card.cardNumber) return card.cardNumber;
  if (card.setOrder && card.setOrder > 0) return `S01-${padCardNumber(card.setOrder)}`;
  return null;
};

const getFallbackIndex = (card: MvpCardView) => {
  if (card.issuedSupply > 0) {
    return Math.min(card.issuedSupply, card.plannedSupply || card.issuedSupply);
  }

  const digits = `${card.templateId}${card.tokenId}`.replace(/\D/g, "");
  if (!digits) return 1;
  const raw = Number.parseInt(digits.slice(-6), 10);
  return (raw % Math.max(card.plannedSupply || 999, 1)) + 1;
};

const getCardText = (card: MvpCardView, quantity: number) => {
  if (card.cardText && card.cardText.trim().length > 0) return card.cardText;
  const faction = card.faction ?? "Unaligned";
  const chain = card.primaryChain ?? "Multichain";
  return `${card.symbol} channels ${faction} resonance on ${chain}. Owned copies: ${quantity}.`;
};

export function MvpCardTile({ card, quantity, size = "collection" }: Props) {
  const rarityTheme = getRarityTheme(card.rarity);
  const editionTheme = getEditionTheme(card.edition);
  const frameTheme = getCardFrameTheme(card.rarity, card.edition);
  const factionColor = getFactionAccent(card.faction);
  const chainColor = getChainAccent(card.primaryChain);
  const ornament = getRarityOrnament(card.rarity);
  const editionKey = getEditionThemeKey(card.edition);
  const isFullArt = editionKey === "full-art";
  const ownedCount = quantity ?? card.instanceCount;
  const canonicalCardNumber = getPrintedCardNumber(card);
  const fallbackIndex = getFallbackIndex(card);

  const setName = card.setCode ?? DEFAULT_SET_NAME;
  const setEdition = card.setEditionLabel ?? DEFAULT_SET_EDITION;

  const cardStyle = {
    "--mvp-accent": rarityTheme.accent,
    "--mvp-glow": rarityTheme.glow,
    "--mvp-border": rarityTheme.border,
    "--mvp-badge": rarityTheme.badge,
    "--mvp-bg": editionTheme.treatment,
    "--mvp-sheen": editionTheme.sheen,
    "--mvp-foil": rarityTheme.foil,
    "--mvp-edition-foil": editionTheme.foilOverlay,
    "--mvp-art-treatment": editionTheme.artTreatment,
    "--mvp-gloss-opacity": `${editionTheme.glossOpacity}`,
    "--mvp-art-scale": `${editionTheme.artScale}`,
    "--mvp-edition-badge": editionTheme.badgeTint,
    "--mvp-faction": factionColor,
    "--mvp-chain": chainColor,
    "--mvp-frame-shell": frameTheme.shell,
    "--mvp-frame-inner": frameTheme.inner,
    "--mvp-divider": frameTheme.divider,
    "--mvp-footer": editionTheme.footer,
    "--mvp-ornament": ornament,
  } as CSSProperties;

  return (
    <article className={`mvp-premium-card mvp-size-${size} mvp-edition-${editionKey}${isFullArt ? " mvp-full-art" : ""}`} style={cardStyle}>
      <div className="mvp-card-noise" />
      <div className="mvp-card-gloss" />

      <header className="mvp-zone mvp-card-header">
        <div className="mvp-card-name-wrap">
          <h3 className="mvp-card-name">{card.displayName}</h3>
          <p className="mvp-token-symbol">{card.symbol}</p>
        </div>
        <div className="mvp-header-badges">
          <span className="mvp-chip mvp-chip-rarity">{card.rarity}</span>
          <span className="mvp-chip mvp-chip-edition">{prettyEditionLabel(card.edition)}</span>
        </div>
      </header>

      <div className="mvp-zone mvp-card-art-shell">
        <div className="mvp-card-art-glow" />
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt={card.displayName} loading="lazy" className="mvp-card-art" />
        ) : (
          <div className="mvp-card-art-placeholder">MCG</div>
        )}
      </div>

      <section className="mvp-zone mvp-card-textbox">
        <p>{getCardText(card, ownedCount)}</p>
      </section>

      <footer className="mvp-zone mvp-card-footer">
        <span className="mvp-footer-code">{canonicalCardNumber ?? `TMP-${padCardNumber(fallbackIndex)}`}</span>
        <span className="mvp-footer-meta">{setName} · {setEdition}</span>
        <span className="mvp-footer-supply">
          {card.plannedSupply > 0 ? `${padCardNumber(Math.min(card.issuedSupply || fallbackIndex, card.plannedSupply))} / ${card.plannedSupply}` : "Unnumbered test mint"}
        </span>
      </footer>
    </article>
  );
}
