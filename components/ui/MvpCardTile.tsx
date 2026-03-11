import type { CSSProperties } from "react";
import type { MvpCardView } from "@/types/cards";
import {
  getCardFrameTheme,
  getChainAccent,
  getEditionTheme,
  getFactionAccent,
  getRarityTheme,
  prettyEditionLabel,
} from "@/components/ui/mvpCardTheme";

type Props = {
  card: MvpCardView;
  quantity?: number;
};

const SET_NAME = "GENESIS";
const SET_EDITION = "Edition 1";

const padCardNumber = (value: number) => value.toString().padStart(3, "0");

const getPrintedCardNumber = (card: MvpCardView) => {
  if (card.issuedSupply > 0) {
    return Math.min(card.issuedSupply, card.plannedSupply || card.issuedSupply);
  }

  const digits = `${card.templateId}${card.tokenId}`.replace(/\D/g, "");
  if (!digits) return 1;
  const raw = Number.parseInt(digits.slice(-6), 10);
  return (raw % Math.max(card.plannedSupply, 1)) + 1;
};

const buildCardText = (card: MvpCardView, quantity: number) => {
  const faction = card.faction ?? "Unaligned";
  const chain = card.primaryChain ?? "Multichain";
  return `${card.symbol} channels ${faction} resonance on ${chain}. Owned copies: ${quantity}.`;
};

export function MvpCardTile({ card, quantity }: Props) {
  const rarityTheme = getRarityTheme(card.rarity);
  const editionTheme = getEditionTheme(card.edition);
  const frameTheme = getCardFrameTheme(card.rarity, card.edition);
  const factionColor = getFactionAccent(card.faction);
  const chainColor = getChainAccent(card.primaryChain);
  const isFullArt = card.edition.toUpperCase() === "FULL_ART";
  const ownedCount = quantity ?? card.instanceCount;
  const cardNumber = getPrintedCardNumber(card);

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
    "--mvp-frame-shell": frameTheme.shell,
    "--mvp-frame-inner": frameTheme.inner,
    "--mvp-divider": frameTheme.divider,
    "--mvp-footer": editionTheme.footer,
  } as CSSProperties;

  return (
    <article className={`mvp-premium-card${isFullArt ? " mvp-full-art" : ""}`} style={cardStyle}>
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
        <p>{buildCardText(card, ownedCount)}</p>
      </section>

      <footer className="mvp-zone mvp-card-footer">
        <span className="mvp-footer-pill">#{padCardNumber(cardNumber)}</span>
        <span className="mvp-footer-pill">{SET_NAME}</span>
        <span className="mvp-footer-pill">{SET_EDITION}</span>
        <span className="mvp-footer-pill mvp-footer-pill-strong">{padCardNumber(cardNumber)} / {card.plannedSupply}</span>
      </footer>
    </article>
  );
}
