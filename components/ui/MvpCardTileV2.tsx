import type { CSSProperties } from "react";
import type { MvpCardView } from "@/types/cards";
import { getRarityVars, resolveEdition, resolveRarity } from "@/components/ui/mvpCardThemeV2";
import styles from "@/components/ui/MvpCardTileV2.module.css";

type Props = {
  card: MvpCardView;
  quantity?: number;
  variant?: "collection" | "reveal";
};

const DEFAULT_SET_NAME = "GENESIS";
const DEFAULT_SET_EDITION = "Edition 1";

const MCG_LOGO_B64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAABfUlEQVR4nO2Wa07DMBCEv3GSFqjE/a/IBYCmcZYfXuMQAWrjVAjJI0VJto539jHrQkNDQ0NDBXTPzc2sdx8RQNK8t4/dAzCzAGTihpMHDm47S4o/fH4z+r02AjCzgUR0BC6SzO0CZuARmChBVWO3AJzkkN8lmdsAOlJgE6kquyHsuRnw7nsezUxegQAcSQHM7Jh9uI8GeuABuFCyHQH7FyLOcD0YELMW3P7F51Iny3XXYnMAZtYB85rAYnSapGmxPlA0cqFMqUBqrbBcfy1qRGxOaFxlL64z6VkPwOhBdv6e9dBLGreQqGqh3A5bSu+VyphJFbt5n81TyFviV/LLfl89B0rygl+HLTxuroAT6fwa/R6/0UImNrufjtQymfxMasMn4AxMW6bUVg2IctKuhZfFKUqCBEhS9AREioDfqBixtRp4Bk4UMU5OaCAdaif38Uo6G3pf2wGdpJca/1AfQG6lz3+c+Ehc3PNvXf7MbYOk1xr/DQ0NDQ0NDX+ND3LlsB6hJmdVAAAAAElFTkSuQmCC";

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

const getCardText = (card: MvpCardView) => {
  if (card.cardText && card.cardText.trim().length > 0) return card.cardText;
  return "No flavor text available in token-master.";
};

function Corner({ stroke, detail, dot }: { stroke: string; detail: boolean; dot: boolean }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M1 13V1H13" stroke={stroke} strokeWidth={dot ? "1" : "0.9"} />
      {detail && <rect x="1" y="1" width="3" height="3" stroke={stroke} strokeWidth="0.6" opacity="0.7" fill="none" />}
      {dot && <circle cx="2.5" cy="2.5" r="0.7" fill={stroke} opacity="0.6" />}
    </svg>
  );
}

export function MvpCardTileV2({ card, quantity, variant = "collection" }: Props) {
  const rarity = resolveRarity(card.rarity);
  const edition = resolveEdition(card.edition);
  const cardNumber = getPrintedCardNumber(card);
  const fallbackIndex = getFallbackIndex(card);
  const setName = card.setCode ?? DEFAULT_SET_NAME;
  const setEdition = card.setEditionLabel ?? DEFAULT_SET_EDITION;

  const shouldShowQuantity = variant === "collection" && Number.isFinite(quantity) && (quantity ?? 0) > 1;

  return (
    <article
      className={`${styles.mvpCard} ${styles[edition.cardClass]} ${variant === "reveal" ? styles.variantReveal : styles.variantCollection}`}
      style={getRarityVars(rarity) as CSSProperties}
      data-card-variant={variant}
    >
      <div className={styles.mvpGrain} aria-hidden="true" />

      {edition.needsReverseLayers && (
        <>
          <div className={styles.mvpReverseFoil} aria-hidden="true" />
          <div className={styles.mvpReverseArtMask} aria-hidden="true" />
          <div className={styles.mvpReverseArtReveal} aria-hidden="true">
            {card.imageUrl && <img src={card.imageUrl} alt="" loading="lazy" />}
          </div>
        </>
      )}

      {edition.needsBrillanteLayer && (
        <>
          <div className={styles.mvpBrillFoil} aria-hidden="true" />
          <div className={styles.mvpBrillGlitter} aria-hidden="true" />
          <div className={styles.mvpBrillSweep} aria-hidden="true" />
        </>
      )}

      {edition.needsHoloLayer && (
        <>
          <div className={styles.mvpHoloLayer} aria-hidden="true" />
          <div className={styles.mvpHoloLines} aria-hidden="true" />
        </>
      )}

      {edition.needsFullArtLayer && (
        <>
          <div className={styles.mvpFullArtPattern} style={{ backgroundImage: `url('${MCG_LOGO_B64}')` }} aria-hidden="true" />
          <div className={styles.mvpFullArtArtMask} aria-hidden="true" />
          <div className={styles.mvpFullArtArtReveal} aria-hidden="true">
            {card.imageUrl && <img src={card.imageUrl} alt="" loading="lazy" />}
          </div>
        </>
      )}

      <span className={`${styles.mvpCo} ${styles.mvpCoTl}`}><Corner stroke={rarity.cornerStroke} detail={rarity.cornerDetail} dot={rarity.cornerDot} /></span>
      <span className={`${styles.mvpCo} ${styles.mvpCoTr}`}><Corner stroke={rarity.cornerStroke} detail={rarity.cornerDetail} dot={rarity.cornerDot} /></span>
      <span className={`${styles.mvpCo} ${styles.mvpCoBl}`}><Corner stroke={rarity.cornerStroke} detail={rarity.cornerDetail} dot={rarity.cornerDot} /></span>
      <span className={`${styles.mvpCo} ${styles.mvpCoBr}`}><Corner stroke={rarity.cornerStroke} detail={rarity.cornerDetail} dot={rarity.cornerDot} /></span>

      {shouldShowQuantity && <span className={styles.qtyBadge}>x{quantity}</span>}

      <header className={styles.mvpHeader}>
        <div className={styles.mvpHeaderLeft}>
          <span className={styles.mvpName}>{card.displayName}</span>
          <span className={styles.mvpTicker}>${card.symbol}</span>
        </div>
        <div className={styles.mvpHeaderRight}>
          <span className={styles.mvpBadgeRarity}>{card.rarity}</span>
          {edition.badgeLabel && <span className={styles.mvpBadgeEdition}>{edition.badgeLabel}</span>}
        </div>
      </header>

      <div className={styles.mvpArt} style={edition.prioritizeArt || edition.needsReverseLayers ? { visibility: "hidden" } : undefined}>
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.displayName} loading="lazy" />
        ) : (
          <div className={styles.mvpArtPlaceholder}>MCG</div>
        )}
      </div>

      <section className={styles.mvpTextbox}>
        <p>{getCardText(card)}</p>
      </section>

      <footer className={styles.mvpFooter}>
        <span className={styles.mvpFooterCode}>{cardNumber ?? `TMP-${padCardNumber(fallbackIndex)}`}</span>
        <span className={styles.mvpFooterSet}>{setName} · {setEdition}</span>
        <span className={styles.mvpFooterSupply}>
          {card.plannedSupply > 0
            ? `${padCardNumber(Math.min(card.issuedSupply || fallbackIndex, card.plannedSupply))} / ${card.plannedSupply}`
            : "Unnumbered test mint"}
        </span>
      </footer>
    </article>
  );
}
