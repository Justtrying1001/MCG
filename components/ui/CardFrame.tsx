import type { BaseCard } from "@/types/cards";

type Props = {
  card: BaseCard;
  quantity?: number;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
};

const VARIANT_LABELS: Record<string, string> = {
  standard: "STD",
  holo: "HOLO",
  full_art: "FULL ART",
  glitch: "GLITCH",
  gold: "GOLD",
};

const TIER_COLORS: Record<string, string> = {
  S: "#ff3cac",
  A: "#fbbf24",
  B: "#60a5fa",
  C: "#6b7280",
  D: "#6b7280",
};

const STAT_BARS = 10;

function statSegments(val: number) {
  return Math.max(0, Math.min(STAT_BARS, Math.round((val || 0) / 10)));
}

export function CardFrame({ card, quantity, selectable, selected, onClick }: Props) {
  const variantType = card.variantType || "standard";
  const variantLabel = card.variantLabel || VARIANT_LABELS[variantType] || "STD";
  const tier = card.projectTier || "C";
  const chainColor = card.chainColor || "#64748b";
  const chainGlow = card.chainGlow || "rgba(100,116,139,0.16)";
  const chainArt = card.chainArt || "radial-gradient(ellipse at 50% 65%,#0d1218 0%,#060810 100%)";

  return (
    <article
      className={`mcg-card tier-${tier} vt-${variantType}${selected ? " is-selected" : ""}`}
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : undefined,
        ["--fc-color" as string]: chainColor,
        ["--fc-glow" as string]: chainGlow,
        ["--fc-art" as string]: chainArt,
      }}
    >
      <div className="mcg-card-inner">
        <div className="mcg-card-band" />

        <div className="mcg-card-header">
          <div>
            <p className="mcg-card-name">{card.name}</p>
            <p className="mcg-card-subtitle">{card.subtitle || `${card.primaryChain || "Chain"} · ${card.symbol}`}</p>
          </div>

          <div className="mcg-card-badges">
            <span className="mcg-variant-badge">{variantLabel}</span>
            <span className="mcg-tier-badge" style={{ color: TIER_COLORS[tier] || TIER_COLORS.C }}>TIER {tier}</span>
          </div>
        </div>

        <div className="mcg-art-zone">
          <div className="mcg-art-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.image} alt={card.name} loading="lazy" />
          </div>

          <div className="mcg-art-bottom">
            <span className="mcg-chain-pill">
              <span className="mcg-chain-dot" style={{ background: chainColor }} />
              {card.faction || "Other"}
            </span>
            <span className="mcg-rank">#{card.marketCapRank ?? "—"}</span>
          </div>
        </div>

        <div className="mcg-tags">
          <span className="mcg-tag chain">{card.primaryChain || "Other"}</span>
          <span className="mcg-tag">{card.symbol}</span>
          <span className="mcg-tag">{card.variantRarity || "common"}</span>
        </div>

        <div className="mcg-stats">
          {[
            ["ATK", card.ATK, "atk"],
            ["DEF", card.DEF, "def"],
            ["SPD", card.SPD, "spd"],
            ["CTRL", card.CTRL, "ctrl"],
          ].map(([label, value, cls]) => (
            <div className="mcg-stat-row" key={label}>
              <span className={`mcg-stat-label ${cls}`}>{label}</span>
              <div className="mcg-stat-segs">
                {Array.from({ length: STAT_BARS }).map((_, idx) => (
                  <span key={idx} className={`mcg-seg ${idx < statSegments(Number(value)) ? `on ${cls}` : ""}`} />
                ))}
              </div>
              <span className={`mcg-stat-value ${cls}`}>{value}</span>
            </div>
          ))}
        </div>

        <div className="mcg-card-footer">
          <span className="mcg-card-id">{card.variantId || card.baseCardId}</span>
          {selectable ? (
            <span className="select-indicator">{selected ? "✓ Team" : "+ Team"}</span>
          ) : (
            <span className="mcg-card-power">POW <b>{card.powerScore ?? Math.round((card.ATK + card.DEF + card.SPD + card.CTRL) / 4)}</b></span>
          )}
          {typeof quantity === "number" ? <span className="mcg-qty">×{quantity}</span> : null}
        </div>
      </div>
    </article>
  );
}
