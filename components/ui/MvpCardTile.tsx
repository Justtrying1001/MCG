import type { CSSProperties } from "react";
import type { MvpCardView } from "@/types/cards";
import {
  getCardFrameTheme,
  getChainAccent,
  getEditionTheme,
  getFactionAccent,
  getRarityOrnament,
  getRarityTheme,
  prettyEditionLabel,
} from "@/components/ui/mvpCardTheme";
import styles from "@/components/ui/MvpCardTile.module.css";

type Props = {
  card: MvpCardView;
  quantity?: number;
  variant?: "collection" | "reveal";
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
  return `${card.symbol} of the ${faction} line, anchored on ${chain}. Collection copy ${quantity}.`;
};

export function MvpCardTile({ card, quantity, variant = "collection" }: Props) {
  const rarityTheme = getRarityTheme(card.rarity);
  const editionTheme = getEditionTheme(card.edition);
  const frameTheme = getCardFrameTheme(card.rarity, card.edition);
  const factionColor = getFactionAccent(card.faction);
  const chainColor = getChainAccent(card.primaryChain);
  const ornament = getRarityOrnament(card.rarity);
  const isFullArt = card.edition.toUpperCase() === "FULL_ART";
  const ownedCount = quantity ?? card.instanceCount;
  const canonicalCardNumber = getPrintedCardNumber(card);
  const fallbackIndex = getFallbackIndex(card);

  const setName = card.setCode ?? DEFAULT_SET_NAME;
  const setEdition = card.setEditionLabel ?? DEFAULT_SET_EDITION;

  const cardStyle = {
    "--mvp-accent": rarityTheme.accent,
    "--mvp-glow": rarityTheme.glow,
    "--mvp-border": rarityTheme.border,
    "--mvp-edge": rarityTheme.edge,
    "--mvp-badge": rarityTheme.badge,
    "--mvp-badge-text": rarityTheme.badgeText,
    "--mvp-bg": editionTheme.treatment,
    "--mvp-sheen": editionTheme.sheen,
    "--mvp-finish": editionTheme.finish,
    "--mvp-art-overlay": editionTheme.artOverlay,
    "--mvp-foil": rarityTheme.foil,
    "--mvp-faction": factionColor,
    "--mvp-chain": chainColor,
    "--mvp-frame-shell": frameTheme.shell,
    "--mvp-frame-inner": frameTheme.inner,
    "--mvp-divider": frameTheme.divider,
    "--mvp-footer": editionTheme.footer,
    "--mvp-ornament": ornament,
  } as CSSProperties;

  return (
    <article
      className={`${styles.card} ${variant === "reveal" ? styles.variantReveal : styles.variantCollection}${isFullArt ? ` ${styles.fullArt}` : ""}`}
      style={cardStyle}
    >
      <div className={styles.noise} />
      <div className={styles.gloss} />

      <header className={`${styles.zone} ${styles.header}`}>
        <div className={styles.nameWrap}>
          <h3 className={styles.name}>{card.displayName}</h3>
          <p className={styles.tokenSymbol}>{card.symbol}</p>
        </div>
        <div className={styles.headerBadges}>
          <span className={styles.chip}>{card.rarity}</span>
          <span className={styles.chip}>{prettyEditionLabel(card.edition)}</span>
        </div>
      </header>

      <div className={`${styles.zone} ${styles.artShell}`}>
        <div className={styles.artGlow} />
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt={card.displayName} loading="lazy" className={styles.art} />
        ) : (
          <div className={styles.artPlaceholder}>MCG</div>
        )}
      </div>

      <section className={`${styles.zone} ${styles.textbox}`}>
        <p className={styles.textboxText}>{getCardText(card, ownedCount)}</p>
      </section>

      <footer className={`${styles.zone} ${styles.footer}`}>
        <span className={styles.footerCode}>{canonicalCardNumber ?? `TMP-${padCardNumber(fallbackIndex)}`}</span>
        <span className={styles.footerMeta}>{setName} · {setEdition}</span>
        <span className={styles.footerSupply}>
          {card.plannedSupply > 0 ? `${padCardNumber(Math.min(card.issuedSupply || fallbackIndex, card.plannedSupply))} / ${card.plannedSupply}` : "Unnumbered test mint"}
        </span>
      </footer>
    </article>
  );
}
