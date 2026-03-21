import Image from "next/image";
import type { CSSProperties } from "react";
import type { MvpCardView } from "@/types/cards";
import { getEditionTheme, getRarityTheme, getRarityVars } from "@/components/ui/mvpCardTheme";

type CardVariant = "canonical" | "zoom";

type Props = {
  card: MvpCardView;
  quantity?: number;
  variant?: CardVariant;
  interactive?: boolean;
  imageLoading?: "lazy" | "eager";
};

const DEFAULT_SET_NAME = "GENESIS";
const DEFAULT_SET_EDITION = "Edition 1";

const padCardNumber = (value: number) => value.toString().padStart(3, "0");

const getStableIndexFromTemplate = (card: MvpCardView) => {
  if (card.setOrder && card.setOrder > 0) return card.setOrder;
  const digits = `${card.templateId}${card.tokenId}`.replace(/\D/g, "");
  if (!digits) return 1;
  const raw = Number.parseInt(digits.slice(-6), 10);
  return (raw % 999) + 1;
};

const getPrintedCardNumber = (card: MvpCardView) => {
  if (card.cardNumber && card.cardNumber.trim().length > 0) return card.cardNumber;
  return `S01-${padCardNumber(getStableIndexFromTemplate(card))}`;
};

const getPullNumber = (card: MvpCardView) => {
  if (card.editionNumber && card.editionNumber > 0) return card.editionNumber;
  return null;
};

const getCardText = (card: MvpCardView) => {
  if (card.cardText && card.cardText.trim().length > 0) return card.cardText;
  if (card.flavorText && card.flavorText.trim().length > 0) return card.flavorText;
  return "No flavor text available in token-master.";
};

export function MvpCardTile({ card, quantity, variant = "canonical", interactive = true, imageLoading = "lazy" }: Props) {
  const rarityTheme = getRarityTheme(card.rarity);
  const editionTheme = getEditionTheme(card.edition);
  const cardNumber = getPrintedCardNumber(card);
  const pullNumber = getPullNumber(card);

  const setName = card.setCode ?? DEFAULT_SET_NAME;
  const setEdition = card.setEditionLabel ?? DEFAULT_SET_EDITION;
  const editionBadge = editionTheme.badgeLabel || editionTheme.label.toUpperCase();
  const cardStyle = getRarityVars(rarityTheme) as CSSProperties;

  return (
    <article
      className={`mvp-premium-card ${editionTheme.editionClass} variant-${variant}${interactive ? "" : " is-static"}`}
      style={cardStyle}
      data-card-variant={variant}
      data-rarity={rarityTheme.code}
      data-edition={editionTheme.code}
    >
      <div className="mvp-card-stock" aria-hidden="true" />
      <div className="mvp-card-grain" aria-hidden="true" />
      <div className="mvp-card-patina" aria-hidden="true" />
      <div className="mvp-card-frame-shadow" aria-hidden="true" />

      {editionTheme.needsReverseLayers && (
        <>
          <div className="mvp-reverse-foil" aria-hidden="true" />
          <div className="mvp-reverse-art-mask" aria-hidden="true" />
          <div className="mvp-reverse-art-reveal" aria-hidden="true">
            {card.imageUrl && <Image src={card.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" />}
          </div>
        </>
      )}

      {editionTheme.needsBrillanteLayer && (
        <>
          <div className="mvp-brill-foil" aria-hidden="true" />
          <div className="mvp-brill-glitter" aria-hidden="true" />
          <div className="mvp-brill-sweep" aria-hidden="true" />
        </>
      )}

      {editionTheme.needsHoloLayer && (
        <>
          <div className="mvp-holo-layer" aria-hidden="true" />
          <div className="mvp-holo-lines" aria-hidden="true" />
        </>
      )}

      {editionTheme.needsMcgArtLayer && (
        <>
          <div className="mvp-mcgart-pattern" aria-hidden="true" />
          <div className="mvp-mcgart-art-mask" aria-hidden="true" />
          <div className="mvp-mcgart-art-reveal" aria-hidden="true">
            {card.imageUrl && <Image src={card.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" />}
          </div>
        </>
      )}

      <header className="mvp-card-header">
        <div className="mvp-card-header-text">
          <span className="mvp-card-name">{card.displayName}</span>
          <span className="mvp-card-ticker">${card.symbol} · {setName}</span>
        </div>
        <div className="mvp-card-header-badges">
          <span className="mvp-badge-rarity">{rarityTheme.label.toUpperCase()}</span>
          <span className="mvp-badge-edition">{editionBadge}</span>
        </div>
      </header>

      <div className="mvp-card-art-shell" style={editionTheme.needsMcgArtLayer || editionTheme.needsReverseLayers ? { visibility: "hidden" } : undefined}>
        <div className="mvp-card-art-frame" aria-hidden="true" />
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={card.displayName}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            loading={imageLoading}
          />
        ) : (
          <div className="mvp-card-art-placeholder">MCG</div>
        )}
      </div>

      <section className="mvp-card-textbox">
        <div className="mvp-card-textbox-inner">
          <span className="mvp-card-textbox-label">Collector notes</span>
          <p>{getCardText(card)}</p>
        </div>
      </section>

      <footer className="mvp-card-footer">
        <span className="mvp-footer-code">{cardNumber}</span>
        <span className="mvp-footer-center">{setName} · {setEdition}</span>
        <span className="mvp-footer-supply">
          {card.plannedSupply > 0
            ? pullNumber
              ? `${padCardNumber(Math.min(pullNumber, card.plannedSupply))} / ${padCardNumber(card.plannedSupply)}`
              : `MAX ${padCardNumber(card.plannedSupply)}`
            : "UNLTD"}
        </span>
        {typeof quantity === "number" && quantity > 1 ? <span className="mvp-footer-quantity">x{quantity}</span> : null}
      </footer>
    </article>
  );
}
