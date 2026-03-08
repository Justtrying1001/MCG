import type { BaseCard } from "@/types/cards";

type Props = {
  card: BaseCard;
  quantity?: number;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
};

const FINISH_LABELS: Record<string, string> = {
  standard: "STANDARD",
  holo: "HOLO",
  full_art: "FULL ART",
  glitch: "GLITCH",
  gold: "GOLD",
};

const RARITY_LABELS: Record<string, string> = {
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
  legendary: "LEGENDARY",
};

const STAT_ORDER = [
  ["ATK", "atk"],
  ["DEF", "def"],
  ["SPD", "spd"],
  ["CTRL", "ctrl"],
] as const;

function combatScore(card: BaseCard) {
  if (typeof card.combatScore === "number") return card.combatScore;
  return Math.max(0, Math.min(100, Math.round(card.ATK * 0.34 + card.DEF * 0.27 + card.SPD * 0.21 + card.CTRL * 0.18)));
}

function makeCardNumber(card: BaseCard) {
  if (card.collectorId) {
    const parts = card.collectorId.split("-");
    return parts[parts.length - 1] || "00000";
  }
  return card.baseCardId.replace(/^base_/, "").slice(0, 6).toUpperCase();
}

function toBaseRarity(card: BaseCard) {
  if (card.baseRarity) return card.baseRarity;
  if (card.projectTier === "S") return "legendary";
  if (card.projectTier === "A") return "epic";
  if (card.projectTier === "B") return "rare";
  return "common";
}

function toFinish(card: BaseCard) {
  return card.finish || card.variantType || "standard";
}

export function CardFrame({ card, quantity, selectable, selected, onClick }: Props) {
  const rarity = toBaseRarity(card);
  const finish = toFinish(card);
  const finishLabel = FINISH_LABELS[finish] || finish.toUpperCase();
  const rarityLabel = RARITY_LABELS[rarity] || rarity.toUpperCase();
  const chainColor = card.chainColor || "#64748b";
  const chainGlow = card.chainGlow || "rgba(100,116,139,0.16)";
  const chainArt = card.chainArt || "radial-gradient(ellipse at 50% 65%,#0d1218 0%,#060810 100%)";
  const score = combatScore(card);
  const setCode = "GEN1";
  const cardNumber = makeCardNumber(card);

  return (
    <article
      className={`mcg-card br-${rarity} fn-${finish}${selected ? " is-selected" : ""}`}
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : undefined,
        ["--fc-color" as string]: chainColor,
        ["--fc-glow" as string]: chainGlow,
        ["--fc-art" as string]: chainArt,
      }}
    >
      <div className="mcg-card-inner">
        <div className="mcg-card-header">
          <div className="mcg-card-idline">
            <span>{setCode}</span>
            <span>#{cardNumber}</span>
          </div>

          <div className="mcg-card-name-wrap">
            <p className="mcg-card-name">{card.name}</p>
            <p className="mcg-card-symbol">${card.symbol}</p>
          </div>

          <div className="mcg-rarity-crest" aria-label={rarityLabel}>
            <span className="mcg-rarity-dot" />
            <span>{rarityLabel}</span>
          </div>
        </div>

        <div className="mcg-hero-zone">
          <div className="mcg-hero-bg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mcg-hero-img" src={card.image} alt={card.name} loading="lazy" />
          <div className="mcg-hero-vignette" />
          <div className="mcg-finish-layer" />
        </div>

        <div className="mcg-type-line">
          <span>{card.archetype || "balanced"}</span>
          <span>•</span>
          <span>{card.primaryChain || "Other"}</span>
          <span>•</span>
          <span>{card.faction || "Other"}</span>
        </div>

        <div className="mcg-combat-panel">
          <div className="mcg-combat-score">
            <span className="mcg-combat-score-label">Combat</span>
            <span className="mcg-combat-score-val">{score}</span>
          </div>

          <div className="mcg-stats-grid">
            {STAT_ORDER.map(([label, cls]) => {
              const value = card[label];
              return (
                <div className="mcg-stat-pill" key={label}>
                  <span className={`mcg-stat-pill-label ${cls}`}>{label}</span>
                  <span className="mcg-stat-pill-val">{value}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mcg-card-footer">
          <span className="mcg-footer-collector">{card.collectorId || `${setCode}-${cardNumber}`}</span>

          {selectable ? (
            <span className="mcg-select-indicator">{selected ? "✓ Team" : "+ Team"}</span>
          ) : (
            <span className="mcg-footer-finish">{finishLabel}</span>
          )}

          {typeof quantity === "number" ? <span className="mcg-qty">×{quantity}</span> : <span className="mcg-footer-rarity">{rarityLabel}</span>}
        </div>
      </div>
    </article>
  );
}
