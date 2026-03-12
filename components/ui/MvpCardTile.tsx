import type { CSSProperties } from "react";
import type { MvpCardView } from "@/types/cards";
import { getEditionTheme, getRarityTheme, getRarityVars, prettyEditionLabel } from "@/components/ui/mvpCardTheme";

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

const getCardText = (card: MvpCardView) => {
  if (card.cardText && card.cardText.trim().length > 0) return card.cardText;
  return "No flavor text available in token-master.";
};

function Corner({ stroke, detail, dot }: { stroke: string; detail: boolean; dot: boolean }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 13V1H13" stroke={stroke} strokeWidth={dot ? "1" : "0.9"} />
      {detail && <rect x="1" y="1" width="3" height="3" stroke={stroke} strokeWidth="0.6" opacity="0.7" fill="none" />}
      {dot && <circle cx="2.5" cy="2.5" r="0.7" fill={stroke} opacity="0.6" />}
    </svg>
  );
}

export function MvpCardTile({ card, quantity, variant = "collection" }: Props) {
  const rarityTheme = getRarityTheme(card.rarity);
  const editionTheme = getEditionTheme(card.edition);
  const canonicalCardNumber = getPrintedCardNumber(card);
  const fallbackIndex = getFallbackIndex(card);

  const setName = card.setCode ?? DEFAULT_SET_NAME;
  const setEdition = card.setEditionLabel ?? DEFAULT_SET_EDITION;

  const cardStyle = getRarityVars(rarityTheme) as CSSProperties;

  return (
    <article className={`mvp-premium-card ${editionTheme.editionClass} variant-${variant}`} style={cardStyle} data-card-variant={variant}>
      <div className="mvp-card-grain" aria-hidden="true" />

      {editionTheme.needsReverseLayers && (
        <>
          <div className="mvp-reverse-foil" aria-hidden="true" />
          <div className="mvp-reverse-art-mask" aria-hidden="true" />
          <div className="mvp-reverse-art-reveal" aria-hidden="true">
            {card.imageUrl && <img src={card.imageUrl} alt="" />}
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
            {card.imageUrl && <img src={card.imageUrl} alt="" />}
          </div>
        </>
      )}

      <span className="mvp-corner mvp-corner-tl" aria-hidden="true">
        <Corner stroke={rarityTheme.cornerStroke} detail={rarityTheme.cornerDetail} dot={rarityTheme.cornerDot} />
      </span>
      <span className="mvp-corner mvp-corner-tr" aria-hidden="true">
        <Corner stroke={rarityTheme.cornerStroke} detail={rarityTheme.cornerDetail} dot={rarityTheme.cornerDot} />
      </span>
      <span className="mvp-corner mvp-corner-bl" aria-hidden="true">
        <Corner stroke={rarityTheme.cornerStroke} detail={rarityTheme.cornerDetail} dot={rarityTheme.cornerDot} />
      </span>
      <span className="mvp-corner mvp-corner-br" aria-hidden="true">
        <Corner stroke={rarityTheme.cornerStroke} detail={rarityTheme.cornerDetail} dot={rarityTheme.cornerDot} />
      </span>

      <header className="mvp-card-header">
        <div className="mvp-card-header-left">
          <span className="mvp-card-name">{card.displayName}</span>
          <span className="mvp-card-ticker">${card.symbol}</span>
        </div>
        <div className="mvp-card-header-right">
          <span className="mvp-badge-rarity">{card.rarity}</span>
          <span className="mvp-badge-edition">{prettyEditionLabel(card.edition)}</span>
        </div>
      </header>

      <div className="mvp-card-art-shell" style={editionTheme.needsMcgArtLayer || editionTheme.needsReverseLayers ? { visibility: "hidden" } : undefined}>
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt={card.displayName} loading={variant === "reveal" ? "eager" : "lazy"} />
        ) : (
          <div className="mvp-card-art-placeholder">MCG</div>
        )}
      </div>

      <section className="mvp-card-textbox">
        <p>{getCardText(card)}</p>
      </section>

      <footer className="mvp-card-footer">
        <span className="mvp-footer-code">{canonicalCardNumber ?? `TMP-${padCardNumber(fallbackIndex)}`}</span>
        <span className="mvp-footer-sep" aria-hidden="true" />
        <span className="mvp-footer-set">{setName} · {setEdition}</span>
        <span className="mvp-footer-sep" aria-hidden="true" />
        <span className="mvp-footer-set mvp-footer-supply">
          {card.plannedSupply > 0
            ? `${padCardNumber(Math.min(card.issuedSupply || fallbackIndex, card.plannedSupply))} / ${card.plannedSupply}`
            : "Unnumbered test mint"}
        </span>
      </footer>

      {typeof quantity === "number" && quantity > 1 && <div className="mvp-qty-chip">x{quantity}</div>}
    </article>
  );
}
