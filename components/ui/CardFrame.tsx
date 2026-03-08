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
  const isShiny = variantType === "holo" || variantType === "gold" || variantType === "full_art";
  const powerScore = card.powerScore ?? Math.round((card.ATK + card.DEF + card.SPD + card.CTRL) / 4);

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
        {/* Holo / foil sheen overlay */}
        {isShiny && <div className="mcg-foil-sheen" />}

        {/* ── HEADER ── */}
        <div className="mcg-card-header">
          <div className="mcg-card-name-wrap">
            <p className="mcg-card-name">{card.name}</p>
            <p className="mcg-card-subtitle">
              {card.primaryChain || "Chain"} · {card.symbol}
            </p>
          </div>

          <div className="mcg-card-badges">
            <div className="mcg-tier-badge">{tier}</div>
            {variantType !== "standard" ? <span className="mcg-variant-badge">{variantLabel}</span> : null}
          </div>
        </div>

        {/* ── HERO / ART ZONE ── */}
        <div className="mcg-art-zone">
          {/* Central medallion emblem */}
          <div className="mcg-medallion-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="mcg-medallion-img"
              src={card.image}
              alt={card.name}
              loading="lazy"
            />
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="mcg-stats">
          {(
            [
              ["ATK", card.ATK, "atk"],
              ["DEF", card.DEF, "def"],
              ["SPD", card.SPD, "spd"],
              ["CTRL", card.CTRL, "ctrl"],
            ] as [string, number, string][]
          ).map(([label, value, cls]) => (
            <div className="mcg-stat-row" key={label}>
              <span className={`mcg-stat-label ${cls}`}>{label}</span>
              <div className="mcg-stat-track">
                {Array.from({ length: STAT_BARS }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`mcg-seg ${idx < statSegments(value) ? `on ${cls}` : ""}`}
                  />
                ))}
              </div>
              <span className={`mcg-stat-val ${cls}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* ── FOOTER ── */}
        <div className="mcg-card-footer">
          <span className="mcg-footer-id">{card.variantId || card.baseCardId}</span>

          <span className="mcg-footer-meta">{card.faction || "Other"}</span>

          {selectable ? (
            <span className="mcg-select-indicator">{selected ? "✓ Team" : "+ Team"}</span>
          ) : (
            <span className="mcg-footer-pow">
              POW <b>{powerScore}</b>
            </span>
          )}

          {typeof quantity === "number" ? (
            <span className="mcg-qty">×{quantity}</span>
          ) : (
            <span className="mcg-footer-rarity">{card.variantRarity || "common"}</span>
          )}
        </div>
      </div>
    </article>
  );
}
