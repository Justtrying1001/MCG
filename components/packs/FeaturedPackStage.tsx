import Image from "next/image";
import { GAME_CONFIG } from "@/lib/game-config";

type RarityOdd = { label: string; pct: number };

type FeaturedPackStageProps = {
  packImageSrc: unknown;
  packName: string;
  cardsPerPack: number;
  remaining?: number;
  planned?: number;
  isOpening: boolean;
  openingPhase: "idle" | "tearing" | "revealing";
  canOpen: boolean;
  onOpen: () => void;
  onOpenOdds: () => void;
  rarityOdds?: RarityOdd[];
  userPoints?: number;
};

const DEFAULT_RARITY_ODDS: RarityOdd[] = [
  { label: "COMMON", pct: 73 },
  { label: "UNCOMMON", pct: 18 },
  { label: "RARE", pct: 6 },
  { label: "EPIC", pct: 2.5 },
  { label: "LEGENDARY", pct: 0.3 },
];

const RARITY_DOT_COLOR: Record<string, string> = {
  COMMON: "#7E8794",
  UNCOMMON: "#4FA39A",
  RARE: "#3C6DF2",
  EPIC: "#6E4CCF",
  LEGENDARY: "#D8A63E",
};

const SLOT_DEFINITIONS = [
  { range: "Slots 1–3", type: "STANDARD", desc: "Standard draw" },
  { range: "Slot 4", type: "EDITION BOOST", desc: "Higher chance of rare editions" },
  { range: "Slot 5", type: "RARITY HIT", desc: "Guaranteed elevated rarity" },
];

// Placeholder card colors for preview strip (one per rarity tier + repeat)
const PREVIEW_BORDER_COLORS = [
  "#7E8794",
  "#4FA39A",
  "#3C6DF2",
  "#6E4CCF",
  "#D8A63E",
  "#4FA39A",
];

export function FeaturedPackStage({
  packImageSrc,
  packName,
  cardsPerPack,
  remaining,
  planned,
  isOpening,
  openingPhase,
  canOpen,
  onOpen,
  onOpenOdds,
  rarityOdds,
  userPoints,
}: FeaturedPackStageProps) {
  const packCost = GAME_CONFIG.PACK_COST;
  const displayOdds = rarityOdds && rarityOdds.length > 0 ? rarityOdds : DEFAULT_RARITY_ODDS;
  const canAfford = userPoints === undefined || userPoints >= packCost;

  const ctaLabel =
    openingPhase === "tearing"
      ? "Breaking seal…"
      : isOpening
        ? "Preparing reveal…"
        : `OPEN A PACK — ${packCost} PTS`;

  const supplyText =
    typeof remaining === "number"
      ? `${remaining.toLocaleString()} packs remaining`
      : typeof planned === "number"
        ? `${planned.toLocaleString()} total planned`
        : "Supply pending";

  return (
    <div className="ps-layout">
      {/* ── LEFT: Pack Hero ── */}
      <div className="ps-hero">
        <div className="ps-hero-glow" />

        <div className="ps-hero-image-wrap">
          <Image
            src={packImageSrc as Parameters<typeof Image>[0]["src"]}
            alt="MCG booster pack"
            className="ps-hero-image"
            priority
          />
        </div>

        <div className="ps-hero-meta">
          <span className="ps-edition-badge">GENESIS</span>
          <h1 className="ps-pack-name">{packName.toUpperCase()}</h1>
          <p className="ps-supply-counter">{supplyText}</p>
        </div>
      </div>

      {/* ── RIGHT: Details Panel ── */}
      <div className="ps-panel">

        {/* 1 — Price */}
        <div className="ps-price-block">
          <span className="ps-price-label">PRICE</span>
          <span className="ps-price-value">{packCost} PTS</span>
          {!canAfford && (
            <span className="ps-price-warn">Not enough points</span>
          )}
        </div>

        {/* 2 — What's inside */}
        <div className="ps-section">
          <h2 className="ps-section-title">WHAT'S INSIDE</h2>
          <p className="ps-cards-count">{cardsPerPack} cards per pack</p>
          <div className="ps-slots-list">
            {SLOT_DEFINITIONS.map((slot) => (
              <div key={slot.range} className="ps-slot-row">
                <span className="ps-slot-range">{slot.range}</span>
                <span className="ps-slot-pill">{slot.type}</span>
                <span className="ps-slot-desc">{slot.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3 — Rarity odds */}
        <div className="ps-section">
          <h2 className="ps-section-title">
            RARITY ODDS{" "}
            <span className="ps-section-note">(Slots 1–3)</span>
          </h2>
          <div className="ps-odds-list">
            {displayOdds.map((odd) => (
              <div key={odd.label} className="ps-odd-row">
                <span
                  className="ps-rarity-dot"
                  style={{
                    background: RARITY_DOT_COLOR[odd.label] ?? "#7E8794",
                  }}
                />
                <span className="ps-rarity-label">{odd.label}</span>
                <span className="ps-rarity-pct">{odd.pct}%</span>
              </div>
            ))}
          </div>
          <p className="ps-odds-note">Slot 5 has elevated rarity odds.</p>
        </div>

        {/* 4 — Card preview strip */}
        <div className="ps-section">
          <h2 className="ps-section-title">POSSIBLE PULLS</h2>
          <div className="ps-preview-strip">
            {PREVIEW_BORDER_COLORS.map((color, i) => (
              <div
                key={i}
                className="ps-preview-card"
                style={{ borderColor: color }}
              >
                <div
                  className="ps-preview-card-inner"
                  style={{
                    background: `linear-gradient(145deg, ${color}22, #0F141908)`,
                  }}
                >
                  <span className="ps-preview-card-label">?</span>
                </div>
              </div>
            ))}
          </div>
          <p className="ps-set-label">50 cards in Set 1 — GENESIS</p>
        </div>

        {/* 5 — CTAs */}
        <div className="ps-cta-block">
          <button
            type="button"
            className="ps-btn-primary"
            onClick={onOpen}
            disabled={!canOpen}
          >
            {ctaLabel}
          </button>
          <button
            type="button"
            className="ps-btn-secondary"
            onClick={onOpenOdds}
          >
            Full odds & supply details
          </button>
        </div>

      </div>
    </div>
  );
}
